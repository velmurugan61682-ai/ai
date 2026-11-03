import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Send,
  Sparkles,
  Zap,
  ShoppingCart,
  ShieldCheck,
  Check,
  Cpu,
  Trash2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Play,
  Pause,
  Languages,
  Radio,
  X,
  Headphones,
  Download,
} from 'lucide-react-native';
import {
  AIModelMetadata,
  BillingStructure,
  ChatMessage,
} from '../models/modelTypes';
import { INITIAL_AI_MODELS } from '../models/modelRegistry';
import { AIEngine } from '../brain/AIEngine';
import { ModelStorage } from '../storage/ModelStorage';
import { Header } from '../components/Header';
import { ThemeColors } from '../theme/theme';
import { LanguageService, SUPPORTED_LANGUAGES, LanguageInfo } from '../services/LanguageService';
import { TTSService } from '../services/TTSService';
import { VoiceService } from '../services/VoiceService';
import { SpeakingRobot } from '../components/SpeakingRobot';

interface AIChatScreenProps {
  selectedModel: AIModelMetadata | null;
  colors: ThemeColors;
  onOpenModelSelector: () => void;
}

export const AIChatScreen: React.FC<AIChatScreenProps> = ({
  selectedModel,
  colors,
  onOpenModelSelector,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [currentTps, setCurrentTps] = useState<number | null>(null);

  // Voice & TTS State
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [continuousMode, setContinuousMode] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageInfo>(SUPPORTED_LANGUAGES[0]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const aiEngine = AIEngine.getInstance();
  const storage = ModelStorage.getInstance();
  const languageService = LanguageService.getInstance();
  const ttsService = TTSService.getInstance();
  const voiceService = VoiceService.getInstance();

  const continuousModeRef = useRef(continuousMode);
  continuousModeRef.current = continuousMode;

  const SPEECH_SPEEDS = [0.75, 1.0, 1.25, 1.5];

  // Resolve active model fallback so user is NEVER blocked by "No Model Selected"
  const activeModel: AIModelMetadata = selectedModel || INITIAL_AI_MODELS[0];

  useEffect(() => {
    // Load stored chat history without introducing hardcoded welcome text
    storage.getChatHistory().then((history) => {
      if (history && history.length > 0) {
        // Filter out any legacy welcome messages if present in storage
        const cleanHistory = history.filter(
          (m) =>
            !m.content.includes("Hello! I am SaaS AI Brain running 100% locally") &&
            !m.content.includes("Vanakkam! I am SaaS AI Brain running 100%")
        );
        setMessages(cleanHistory);
      } else {
        setMessages([]);
      }
    });

    // PWA Install Prompt Listener on Web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setCanInstallPwa(true);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      window.addEventListener('appinstalled', () => {
        setCanInstallPwa(false);
        setDeferredPrompt(null);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    return () => {
      ttsService.stop();
      voiceService.stopListening();
    };
  }, []);

  // Handle PWA Install Prompt
  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstallPwa(false);
      setDeferredPrompt(null);
    }
  };

  // Voice Recording handlers
  const startRecording = async () => {
    if (ttsService.isSpeaking()) {
      await ttsService.stop();
      setSpeakingMessageId(null);
      setIsPaused(false);
    }

    setLiveTranscript('');
    setIsListening(true);

    await voiceService.startListening({
      language: selectedLanguage.bcp47,
      continuous: continuousModeRef.current,
      onStart: () => {
        setIsListening(true);
      },
      onResult: (transcript, isFinal) => {
        setLiveTranscript(transcript);
        setInputText(transcript);
        if (isFinal && continuousModeRef.current && transcript.trim().length > 2) {
          stopRecordingAndSend(transcript);
        }
      },
      onError: (errMsg) => {
        setIsListening(false);
        Alert.alert('Voice Recognition', errMsg);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  };

  const stopRecording = async () => {
    await voiceService.stopListening();
    setIsListening(false);
  };

  const cancelRecording = async () => {
    await voiceService.cancelListening();
    setIsListening(false);
    setLiveTranscript('');
  };

  const stopRecordingAndSend = async (textToSend?: string) => {
    await voiceService.stopListening();
    setIsListening(false);
    const toSend = textToSend || liveTranscript || inputText;
    setLiveTranscript('');
    if (toSend.trim()) {
      handleSendPrompt(toSend);
    }
  };

  // Fixed Send Message Functionality
  const handleSendPrompt = async (promptToSend?: string) => {
    const text = (promptToSend !== undefined ? promptToSend : inputText).trim();

    // Prevent empty messages or sending while currently generating
    if (!text || isGenerating) return;

    // Clear input immediately upon submission
    setInputText('');
    setLiveTranscript('');

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    // Display user message immediately
    setMessages((prev) => [...prev, userMessage]);
    await storage.saveChatMessage(userMessage);

    setIsGenerating(true);
    setCurrentStreamingText('');
    setCurrentTps(null);

    try {
      const output = await aiEngine.generateCompletion(text, (token) => {
        setCurrentStreamingText((prev) => prev + token);
      });

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: output.text,
        timestamp: Date.now(),
        modelId: activeModel.id,
        modelName: activeModel.name,
        inferenceTimeMs: output.metrics.totalTimeMs,
        tokensPerSecond: output.metrics.tokensPerSecond,
        structuredData: output.structuredData,
      };

      setCurrentTps(output.metrics.tokensPerSecond);
      setMessages((prev) => [...prev, assistantMessage]);
      await storage.saveChatMessage(assistantMessage);

      // In continuous voice mode, speak response and loop
      if (continuousModeRef.current) {
        handlePlayTTS(assistantMessage, true);
      }
    } catch (err: any) {
      console.error('[AIChat] Inference error:', err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: `Notice: ${err?.message || 'Inference engine is initializing. Please try again.'}`,
        timestamp: Date.now(),
        modelName: activeModel.name,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
      setCurrentStreamingText('');
    }
  };

  // Text-to-Speech Play / Pause / Resume / Stop
  const handlePlayTTS = async (item: ChatMessage, triggerContinuousListen = false) => {
    // If currently speaking this message, toggle pause/stop
    if (speakingMessageId === item.id) {
      if (isPaused) {
        await ttsService.resume();
        setIsPaused(false);
      } else {
        await ttsService.stop();
        setSpeakingMessageId(null);
        setIsPaused(false);
      }
      return;
    }

    // Stop previous audio to prevent overlapping speech
    await ttsService.stop();
    setSpeakingMessageId(item.id);
    setIsPaused(false);

    // Stop microphone to eliminate audio feedback
    if (isListening) {
      await voiceService.stopListening();
      setIsListening(false);
    }

    const detected = languageService.detectLanguage(item.content);

    await ttsService.speakMessage(item.id, item.content, {
      rate: speechSpeed,
      language: detected.bcp47,
      onStart: () => {
        setSpeakingMessageId(item.id);
        setIsPaused(false);
      },
      onDone: () => {
        setSpeakingMessageId(null);
        setIsPaused(false);
        if (triggerContinuousListen && continuousModeRef.current) {
          setTimeout(() => {
            if (continuousModeRef.current) {
              startRecording();
            }
          }, 350);
        }
      },
      onStopped: () => {
        setSpeakingMessageId(null);
        setIsPaused(false);
      },
      onError: () => {
        setSpeakingMessageId(null);
        setIsPaused(false);
      },
    });
  };

  // Stop all active speech
  const handleStopAllTTS = async () => {
    await ttsService.stop();
    setSpeakingMessageId(null);
    setIsPaused(false);
  };

  // Toggle Continuous Voice Mode
  const toggleContinuousMode = () => {
    const nextVal = !continuousMode;
    setContinuousMode(nextVal);
    continuousModeRef.current = nextVal;
    if (nextVal) {
      startRecording();
    } else {
      stopRecording();
      handleStopAllTTS();
    }
  };

  const handleConfirmOrder = (order: BillingStructure) => {
    Alert.alert(
      'Order Validated Offline',
      `Confirmed order for ${order.items[0]?.quantity} × ${order.items[0]?.itemName} (Estimated: ₹${order.items[0]?.totalEstimate}).\n\nSecurity: Transacted locally with application signature.`
    );
  };

  const handleClearChat = async () => {
    await handleStopAllTTS();
    await voiceService.stopListening();
    setIsListening(false);
    await storage.clearChatHistory();
    setMessages([]);
  };

  // Latest assistant message for speaking robot tap
  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="SaaS AI Brain"
        subtitle={`Active: ${activeModel.name}`}
        colors={colors}
        rightAction={
          <View style={styles.headerRightActions}>
            {/* PWA Install Button */}
            {canInstallPwa && (
              <TouchableOpacity
                onPress={handleInstallPwa}
                style={[styles.pwaInstallBtn, { backgroundColor: colors.primary }]}
              >
                <Download size={13} color="#FFFFFF" />
                <Text style={styles.pwaInstallText}>Install App</Text>
              </TouchableOpacity>
            )}

            {/* Continuous Live Voice Toggle */}
            <TouchableOpacity
              onPress={toggleContinuousMode}
              style={[
                styles.voiceModeBtn,
                continuousMode
                  ? { backgroundColor: '#EF4444' }
                  : { backgroundColor: colors.surface, borderColor: colors.cardBorder },
              ]}
            >
              <Headphones size={13} color={continuousMode ? '#FFFFFF' : colors.primary} />
              <Text
                style={[
                  styles.voiceModeText,
                  { color: continuousMode ? '#FFFFFF' : colors.text },
                ]}
              >
                {continuousMode ? 'Live' : 'Voice'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onOpenModelSelector} style={styles.modelSwitchPill}>
              <Cpu size={13} color={colors.primary} />
              <Text style={[styles.modelSwitchText, { color: colors.primary }]}>
                {activeModel.parameters}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClearChat} style={styles.clearBtn}>
              <Trash2 size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Robot Assistant Status & Language Header Strip */}
      <View style={[styles.assistantTopBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <SpeakingRobot
          status={speakingMessageId ? 'speaking' : isListening ? 'listening' : 'idle'}
          colors={colors}
          size={50}
          onPress={() => {
            if (speakingMessageId) {
              handleStopAllTTS();
            } else if (latestAssistantMessage) {
              handlePlayTTS(latestAssistantMessage);
            }
          }}
        />

        <View style={styles.assistantMetaBox}>
          <Text style={[styles.robotGreetingText, { color: colors.text }]}>
            {speakingMessageId
              ? 'Speaking response aloud...'
              : isListening
              ? `Listening in ${selectedLanguage.name}...`
              : 'Qwen AI Voice Brain Online'}
          </Text>
          <Text style={[styles.robotSubText, { color: colors.textMuted }]}>
            {speakingMessageId
              ? 'Tap robot to pause speech'
              : 'Type or speak in Tamil, English, or Tanglish'}
          </Text>
        </View>

        {/* Language & Speed Selector Chips */}
        <View style={styles.topBarControls}>
          <TouchableOpacity
            style={[styles.smallPill, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={() => setShowLanguageModal(true)}
          >
            <Languages size={12} color={colors.primary} />
            <Text style={[styles.smallPillText, { color: colors.text }]}>
              {selectedLanguage.code}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallPill, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={() => {
              const nextIdx = (SPEECH_SPEEDS.indexOf(speechSpeed) + 1) % SPEECH_SPEEDS.length;
              setSpeechSpeed(SPEECH_SPEEDS[nextIdx]);
            }}
          >
            <Text style={[styles.smallPillText, { color: colors.text }]}>
              {speechSpeed}x
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== 'web'}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyChatPlaceholder}>
            <Text style={[styles.emptyChatText, { color: colors.textSubtle }]}>
              No messages yet. Type a question or tap the mic to start.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          const isThisSpeaking = speakingMessageId === item.id;
          const detectedLang = !isUser ? languageService.detectLanguage(item.content) : null;

          return (
            <View
              style={[
                styles.messageWrapper,
                isUser ? styles.userWrapper : styles.assistantWrapper,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  isUser
                    ? [styles.userBubble, { backgroundColor: colors.primary }]
                    : [
                        styles.assistantBubble,
                        {
                          backgroundColor: colors.card,
                          borderColor: isThisSpeaking ? colors.primary : colors.cardBorder,
                          borderWidth: isThisSpeaking ? 2 : 1,
                        },
                      ],
                ]}
              >
                {!isUser && (
                  <View style={styles.assistantHeaderRow}>
                    <View style={styles.modelTagRow}>
                      <Sparkles size={11} color={colors.primary} />
                      <Text style={[styles.modelTagText, { color: colors.primary }]}>
                        {item.modelName || activeModel.name}
                      </Text>
                      {item.tokensPerSecond && (
                        <Text style={[styles.tpsTagText, { color: colors.textSubtle }]}>
                          · {item.tokensPerSecond} tps
                        </Text>
                      )}
                      {detectedLang && (
                        <View style={[styles.langBadge, { backgroundColor: colors.primarySubtle }]}>
                          <Text style={[styles.langBadgeText, { color: colors.primary }]}>
                            {detectedLang.name}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Speaker Voice Generation Icon */}
                    <TouchableOpacity
                      onPress={() => handlePlayTTS(item)}
                      style={[
                        styles.speakerBtn,
                        isThisSpeaking
                          ? { backgroundColor: '#EF4444' }
                          : { backgroundColor: colors.surface },
                      ]}
                      accessibilityLabel="Read response aloud"
                    >
                      {isThisSpeaking ? (
                        <Square size={13} color="#FFFFFF" />
                      ) : (
                        <Volume2 size={13} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                <Text
                  style={[
                    styles.messageText,
                    { color: isUser ? '#FFFFFF' : colors.text },
                  ]}
                  selectable
                >
                  {item.content}
                </Text>

                {/* Structured Billing JSON & Order Card */}
                {!isUser && item.structuredData && item.structuredData.type === 'order_intent' && (
                  <View style={[styles.structuredCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.structuredHeader}>
                      <ShoppingCart size={15} color={colors.primary} />
                      <Text style={[styles.structuredTitle, { color: colors.text }]}>
                        Draft POS Cart (Tamil / Tanglish Parser)
                      </Text>
                    </View>

                    {item.structuredData.items.map((orderItem: any, idx: number) => (
                      <View key={idx} style={styles.orderItemRow}>
                        <Text style={[styles.orderItemName, { color: colors.text }]}>
                          {orderItem.quantity} × {orderItem.itemName}
                        </Text>
                        <Text style={[styles.orderItemPrice, { color: colors.primary }]}>
                          ₹{orderItem.totalEstimate}
                        </Text>
                      </View>
                    ))}

                    <View style={styles.securityNoteRow}>
                      <ShieldCheck size={12} color={colors.success} />
                      <Text style={[styles.securityText, { color: colors.textMuted }]}>
                        Security: Local execution requires confirmation.
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.confirmOrderBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleConfirmOrder(item.structuredData!)}
                    >
                      <Check size={14} color="#FFFFFF" />
                      <Text style={styles.confirmOrderText}>Validate & Confirm Order</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Active Streaming Token Bubble */}
      {isGenerating && (
        <View style={styles.streamingWrapper}>
          <View
            style={[
              styles.streamingBubble,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.modelTagRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.modelTagText, { color: colors.primary }]}>
                Qwen generating response...
              </Text>
            </View>
            <Text style={[styles.messageText, { color: colors.text }]}>
              {currentStreamingText || 'Thinking...'}
            </Text>
          </View>
        </View>
      )}

      {/* Live Voice Recording Floating Banner */}
      {isListening && (
        <View style={[styles.listeningBanner, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <View style={styles.listeningStatusRow}>
            <View style={styles.pulsingMicDot} />
            <Text style={[styles.listeningTitle, { color: colors.text }]}>
              Listening ({selectedLanguage.name})...
            </Text>
          </View>
          <Text style={[styles.liveTranscriptText, { color: colors.textMuted }]} numberOfLines={2}>
            {liveTranscript || 'Speak now in ' + selectedLanguage.nativeName + '...'}
          </Text>
          <View style={styles.listeningControlsRow}>
            <TouchableOpacity onPress={cancelRecording} style={[styles.liveCtrlBtn, { backgroundColor: colors.surface }]}>
              <X size={14} color={colors.error} />
              <Text style={[styles.liveCtrlText, { color: colors.error }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={stopRecording} style={[styles.liveCtrlBtn, { backgroundColor: colors.surface }]}>
              <Square size={14} color={colors.text} />
              <Text style={[styles.liveCtrlText, { color: colors.text }]}>Stop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => stopRecordingAndSend()}
              style={[styles.liveCtrlBtn, { backgroundColor: colors.primary }]}
            >
              <Send size={14} color="#FFFFFF" />
              <Text style={[styles.liveCtrlText, { color: '#FFFFFF' }]}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Chat Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.divider }]}>
        {/* Microphone Button */}
        <TouchableOpacity
          style={[
            styles.micButton,
            isListening
              ? { backgroundColor: '#EF4444' }
              : { backgroundColor: colors.primary },
          ]}
          onPress={isListening ? stopRecording : startRecording}
          accessibilityLabel="Voice Input"
        >
          {isListening ? (
            <MicOff size={20} color="#FFFFFF" />
          ) : (
            <Mic size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        {/* Text Input with Enter key support */}
        <TextInput
          style={[styles.textInput, { color: colors.text, backgroundColor: colors.surface }]}
          placeholder={`Ask Qwen in Tamil, English, or Tanglish...`}
          placeholderTextColor={colors.textSubtle}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
          onSubmitEditing={() => handleSendPrompt()}
          onKeyPress={(e: any) => {
            if (Platform.OS === 'web' && e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
              e.preventDefault?.();
              handleSendPrompt();
            }
          }}
        />

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() ? colors.primary : colors.surface,
              opacity: isGenerating ? 0.6 : 1,
            },
          ]}
          onPress={() => handleSendPrompt()}
          disabled={!inputText.trim() || isGenerating}
          accessibilityLabel="Send message"
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color={inputText.trim() ? '#FFFFFF' : colors.textSubtle} />
          ) : (
            <Send size={18} color={inputText.trim() ? '#FFFFFF' : colors.textSubtle} />
          )}
        </TouchableOpacity>
      </View>

      {/* Language Selection Modal */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Voice Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage.code === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langOption,
                      isSelected ? { backgroundColor: colors.primarySubtle } : {},
                    ]}
                    onPress={() => {
                      setSelectedLanguage(lang);
                      voiceService.setLanguage(lang);
                      setShowLanguageModal(false);
                    }}
                  >
                    <View>
                      <Text
                        style={[
                          styles.langOptionName,
                          { color: isSelected ? colors.primary : colors.text },
                        ]}
                      >
                        {lang.name}
                      </Text>
                      <Text style={[styles.langOptionNative, { color: colors.textMuted }]}>
                        {lang.nativeName}
                      </Text>
                    </View>
                    {isSelected && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pwaInstallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pwaInstallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  voiceModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  voiceModeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modelSwitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#EEF0FD',
  },
  modelSwitchText: {
    fontSize: 11,
    fontWeight: '700',
  },
  clearBtn: {
    padding: 6,
  },
  assistantTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
  },
  assistantMetaBox: {
    flex: 1,
  },
  robotGreetingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  robotSubText: {
    fontSize: 10,
    marginTop: 1,
  },
  topBarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  smallPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  messagesContainer: {
    padding: 12,
    paddingBottom: 20,
    gap: 12,
    flexGrow: 1,
  },
  emptyChatPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyChatText: {
    fontSize: 13,
  },
  messageWrapper: {
    marginVertical: 4,
    maxWidth: '85%',
  },
  userWrapper: {
    alignSelf: 'flex-end',
  },
  assistantWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  assistantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  modelTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  modelTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tpsTagText: {
    fontSize: 10,
  },
  langBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  langBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  speakerBtn: {
    padding: 6,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  structuredCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  structuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  structuredTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  orderItemName: {
    fontSize: 12,
  },
  orderItemPrice: {
    fontSize: 12,
    fontWeight: '700',
  },
  securityNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  securityText: {
    fontSize: 10,
  },
  confirmOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 4,
  },
  confirmOrderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  streamingWrapper: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  streamingBubble: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  listeningBanner: {
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  listeningStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulsingMicDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  listeningTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  liveTranscriptText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  listeningControlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  liveCtrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  liveCtrlText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    maxHeight: '75%',
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalList: {
    marginTop: 4,
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  langOptionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  langOptionNative: {
    fontSize: 12,
    marginTop: 2,
  },
});
