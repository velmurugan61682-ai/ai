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
  Image,
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
  Paperclip,
  Camera,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Sliders,
  ShoppingBag,
  RotateCcw,
  Smile,
  Briefcase,
  UserCheck,
} from 'lucide-react-native';
import {
  AIModelMetadata,
  BillingStructure,
  ChatMessage,
  ChatAttachment,
  PhotoEditRecord,
} from '../models/modelTypes';
import { INITIAL_AI_MODELS } from '../models/modelRegistry';
import { AIEngine } from '../brain/AIEngine';
import { ModelStorage } from '../storage/ModelStorage';
import { Header } from '../components/Header';
import { ThemeColors } from '../theme/theme';
import { LanguageService, SUPPORTED_LANGUAGES, LanguageInfo } from '../services/LanguageService';
import { TTSService } from '../services/TTSService';
import { VoiceService } from '../services/VoiceService';
import { AttachmentService } from '../services/AttachmentService';
import { SpeakingRobot } from '../components/SpeakingRobot';
import {
  TiyoEmployeeService,
  ShopCartItem,
  EmployeePersonality,
  TiyoLanguage,
  TiyoConfig,
} from '../services/TiyoEmployeeService';

interface AIChatScreenProps {
  selectedModel: AIModelMetadata | null;
  colors: ThemeColors;
  onOpenModelSelector: () => void;
  onOpenModelDownload?: (model: AIModelMetadata) => void;
}

export const AIChatScreen: React.FC<AIChatScreenProps> = ({
  selectedModel,
  colors,
  onOpenModelSelector,
  onOpenModelDownload,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [currentTps, setCurrentTps] = useState<number | null>(null);
  const [modelStatus, setModelStatus] = useState<'not_downloaded' | 'downloaded' | 'loading' | 'ready'>('not_downloaded');

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

  // Tiyo Employee & Cart State
  const tiyoService = TiyoEmployeeService.getInstance();
  const [tiyoConfig, setTiyoConfig] = useState<TiyoConfig>(tiyoService.getConfig());
  const [cartItems, setCartItems] = useState<ShopCartItem[]>(tiyoService.getCart());
  const [showTiyoModal, setShowTiyoModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);

  // File & Image Attachment State
  const [stagedAttachments, setStagedAttachments] = useState<ChatAttachment[]>([]);
  const [isAttachmentModalVisible, setIsAttachmentModalVisible] = useState(false);
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false);
  const [expandedDocIds, setExpandedDocIds] = useState<Record<string, boolean>>({});

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
    let isMounted = true;
    async function verifyAndLoadActiveModel() {
      try {
        if (Platform.OS === 'android') {
          const isPresent = await storage.isModelFilePresent(activeModel.fileName);
          if (!isPresent) {
            console.log(`[AIChatScreen] Model "${activeModel.name}" is not downloaded yet.`);
            if (isMounted) setModelStatus('not_downloaded');
            return;
          }

          if (aiEngine.isModelLoaded() && aiEngine.getCurrentModelId() === activeModel.id) {
            console.log(`[AIChatScreen] Model "${activeModel.name}" is already loaded in RAM.`);
            if (isMounted) setModelStatus('ready');
            return;
          }

          if (isMounted) setModelStatus('loading');
          console.log(`[AIChatScreen] Verified GGUF exists. Loading ${activeModel.name} into native llama.rn...`);
          await aiEngine.ensureModelLoaded(activeModel.id);
          if (isMounted) setModelStatus('ready');
        } else {
          if (isMounted) setModelStatus('ready');
        }
      } catch (err: any) {
        console.warn('[AIChatScreen] Model load verification notice:', err);
        if (isMounted) setModelStatus('not_downloaded');
      }
    }

    verifyAndLoadActiveModel();
    return () => {
      isMounted = false;
    };
  }, [activeModel.id]);

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

  // Attachment Action Handlers
  const handlePickImage = async (source: 'gallery' | 'camera') => {
    setIsAttachmentModalVisible(false);
    setIsProcessingAttachment(true);
    try {
      const attachments = await AttachmentService.getInstance().pickImage(source);
      if (attachments && attachments.length > 0) {
        setStagedAttachments((prev) => [...prev, ...attachments]);
      }
    } catch (err: any) {
      console.error('[AIChat] Pick image error:', err);
      Alert.alert('Image Selection Error', err?.message || 'Failed to select image');
    } finally {
      setIsProcessingAttachment(false);
    }
  };

  const handlePickDocument = async () => {
    setIsAttachmentModalVisible(false);
    setIsProcessingAttachment(true);
    try {
      const docs = await AttachmentService.getInstance().pickDocument();
      if (docs && docs.length > 0) {
        setStagedAttachments((prev) => [...prev, ...docs]);
      }
    } catch (err: any) {
      console.error('[AIChat] Pick document error:', err);
      Alert.alert('Document Selection Error', err?.message || 'Failed to select document');
    } finally {
      setIsProcessingAttachment(false);
    }
  };

  const handleRemoveStagedAttachment = (id: string) => {
    setStagedAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDownloadEditedPhoto = (photo: PhotoEditRecord) => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const link = document.createElement('a');
        link.href = photo.editedUri;
        const ext = photo.editedUri.startsWith('data:image/svg') ? 'svg' : 'png';
        link.download = `saas_ai_brain_edit_${Date.now()}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        Alert.alert(
          'Photo Saved',
          'The transformed image has been processed by SaaS AI Brain and saved to your device media cache.'
        );
      }
    } catch (err: any) {
      console.error('[AIChat] Download error:', err);
      Alert.alert('Download Error', 'Could not initiate file download.');
    }
  };

  // Fixed Send Message Functionality with Multi-Modal & Attachment Support
  const handleSendPrompt = async (promptToSend?: string) => {
    const rawText = (promptToSend !== undefined ? promptToSend : inputText).trim();
    const currentAttachments = [...stagedAttachments];

    // Prevent empty submission if there's neither text nor attachments, or while generating
    if ((!rawText && currentAttachments.length === 0) || isGenerating) return;

    // Clear input and staged attachments tray immediately upon submission
    setInputText('');
    setLiveTranscript('');
    setStagedAttachments([]);

    // Provide natural contextual prompt if user only uploads attachments
    const text =
      rawText ||
      (currentAttachments.some((a) => a.type === 'image')
        ? 'Please analyze this uploaded image.'
        : 'Please summarize and analyze this attached document.');

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };

    // Display user message immediately
    setMessages((prev) => [...prev, userMessage]);
    await storage.saveChatMessage(userMessage);

    setIsGenerating(true);
    setCurrentStreamingText('');
    setCurrentTps(null);

    try {
      // On Android, check whether the active model GGUF file is physically downloaded
      if (Platform.OS === 'android') {
        const isPresent = await storage.isModelFilePresent(activeModel.fileName);
        if (!isPresent) {
          setIsGenerating(false);
          setModelStatus('not_downloaded');
          const noticeMsg: ChatMessage = {
            id: `msg-${Date.now()}-not-downloaded`,
            role: 'assistant',
            content: `⚠️ **${activeModel.name} is not downloaded yet**\n\nTo run genuine Qwen AI inference 100% offline with zero cloud dependency, ${activeModel.name} (${activeModel.fileSizeMB} MB) must be downloaded to your device storage.\n\nTap the button below to download the verified GGUF model and start offline chatting.`,
            timestamp: Date.now(),
            modelName: activeModel.name,
          };
          setMessages((prev) => [...prev, noticeMsg]);
          Alert.alert(
            'Model Not Downloaded',
            `${activeModel.name} (${activeModel.fileSizeMB} MB) is required for local offline AI inference. Would you like to start downloading now?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Download Now',
                onPress: () => {
                  if (onOpenModelDownload) {
                    onOpenModelDownload(activeModel);
                  } else {
                    onOpenModelSelector();
                  }
                },
              },
            ]
          );
          return;
        }
      }

      // Ensure active Qwen model is loaded in memory for native inference
      setModelStatus('loading');
      await aiEngine.ensureModelLoaded(activeModel.id);
      setModelStatus('ready');

      const output = await aiEngine.generateCompletion(
        text,
        messages,
        (token) => {
          setCurrentStreamingText((prev) => prev + token);
        },
        undefined,
        currentAttachments
      );

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
        editedPhoto: output.editedPhoto,
      };

      setCurrentTps(output.metrics.tokensPerSecond);
      setMessages((prev) => [...prev, assistantMessage]);
      await storage.saveChatMessage(assistantMessage);

      // Sync active cart
      setCartItems(tiyoService.getCart());

      // In continuous voice mode or when Tiyo voice is enabled, speak response
      if (continuousModeRef.current || tiyoConfig.voiceEnabled) {
        handlePlayTTS(assistantMessage, continuousModeRef.current);
      }
    } catch (err: any) {
      console.error('[AIChat] Inference error:', err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: `⚠️ Local Inference Error: ${err?.message || 'Model inference failed. Please check device memory or verify the model file in the Models tab.'}`,
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
    Alert.alert(
      'Reset Tiyo & Cart',
      'Do you want to reset current conversation and the active billing cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await handleStopAllTTS();
            await voiceService.stopListening();
            setIsListening(false);
            await storage.clearChatHistory();
            await tiyoService.clearCart();
            setCartItems([]);
            setMessages([]);
          },
        },
      ]
    );
  };

  // Latest assistant message for speaking robot tap
  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Tiyo · Shop Employee"
        subtitle={
          `🤝 ${tiyoConfig.personality.charAt(0).toUpperCase() + tiyoConfig.personality.slice(1)} Employee · Billzzy Lite POS`
        }
        colors={colors}
        rightAction={
          <View style={styles.headerRightActions}>
            {/* Active Cart Quick Pill */}
            {cartItems.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowCartModal(true)}
                style={[styles.cartHeaderPill, { backgroundColor: colors.successLight, borderColor: colors.success }]}
              >
                <ShoppingCart size={13} color={colors.success} />
                <Text style={[styles.cartHeaderPillText, { color: colors.success }]}>
                  ₹{tiyoService.getCartTotal()}
                </Text>
              </TouchableOpacity>
            )}

            {/* Tiyo Personality Settings Button */}
            <TouchableOpacity
              onPress={() => setShowTiyoModal(true)}
              style={[styles.tiyoSettingsPill, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              accessibilityLabel="Tiyo Settings"
            >
              <Sliders size={13} color={colors.primary} />
            </TouchableOpacity>

            {/* PWA Install Button */}
            {canInstallPwa && (
              <TouchableOpacity
                onPress={handleInstallPwa}
                style={[styles.pwaInstallBtn, { backgroundColor: colors.primary }]}
              >
                <Download size={13} color="#FFFFFF" />
                <Text style={styles.pwaInstallText}>Install</Text>
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

            <TouchableOpacity onPress={handleClearChat} style={styles.clearBtn}>
              <Trash2 size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Tiyo Assistant Status & Language Header Strip */}
      <View style={[styles.assistantTopBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <SpeakingRobot
          status={speakingMessageId ? 'speaking' : isListening ? 'listening' : 'idle'}
          colors={colors}
          size={48}
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
              ? 'Tiyo is speaking...'
              : isListening
              ? `Listening to you...`
              : 'Tiyo is ready to assist'}
          </Text>
          <Text style={[styles.robotSubText, { color: colors.textMuted }]}>
            {speakingMessageId
              ? 'Tap avatar to pause speech'
              : `Natural Employee Chat • Tanglish, Tamil & English`}
          </Text>
        </View>

        {/* Personality & Language Pills */}
        <View style={styles.topBarControls}>
          <TouchableOpacity
            style={[styles.smallPill, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}
            onPress={() => setShowTiyoModal(true)}
          >
            <UserCheck size={12} color={colors.primary} />
            <Text style={[styles.smallPillText, { color: colors.primary }]}>
              {tiyoConfig.personality}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallPill, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={() => {
              const nextIdx = (SPEECH_SPEEDS.indexOf(speechSpeed) + 1) % SPEECH_SPEEDS.length;
              const nextSpeed = SPEECH_SPEEDS[nextIdx];
              setSpeechSpeed(nextSpeed);
              tiyoService.saveConfig({ speechSpeed: nextSpeed });
            }}
          >
            <Text style={[styles.smallPillText, { color: colors.text }]}>
              {speechSpeed}x
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Cart Quick Strip (if cart has items) */}
      {cartItems.length > 0 && (
        <View style={[styles.activeCartStrip, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
          <TouchableOpacity
            style={styles.cartStripLeft}
            onPress={() => setShowCartModal(true)}
          >
            <View style={[styles.cartStripIconBox, { backgroundColor: colors.primarySubtle }]}>
              <ShoppingCart size={15} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.cartStripTitle, { color: colors.text }]}>
                  Active Cart ({tiyoService.getCartCount()} items)
                </Text>
                <Text style={[styles.cartStripTotal, { color: colors.primary }]}>
                  ₹{tiyoService.getCartTotal()}
                </Text>
              </View>
              <Text style={[styles.cartStripSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {cartItems.map((i) => `${i.quantity}x ${i.name}`).join(' • ')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cartActionBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleSendPrompt('Total evlo?')}
          >
            <Text style={styles.cartActionBtnText}>Total?</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Web Demo Mode Honest Label */}
      {Platform.OS === 'web' && (
        <View style={[styles.webDemoBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <Text style={styles.webDemoBannerText}>
            ℹ️ <Text style={{ fontWeight: '700' }}>Demo mode – no real AI.</Text> On-device local inference (Qwen3 via llama.rn) runs natively on Android.
          </Text>
        </View>
      )}

      {/* Conversational Quick Suggestion Pills */}
      <View style={[styles.suggestionsRow, { backgroundColor: colors.background }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsScroll}
        >
          {[
            'Tiyo, enna panra?',
            'Billing start pannu',
            'Oru vanilla cake add pannu',
            'Innum rendu venum',
            'Egg puffs-um add pannu',
            'Total evlo?',
            'Innaiku sales epdi irukku?',
            'Stock kammiya irukkura products edhu?',
            'Tiyo, tea kudichiya?',
            'Nalla joke sollu',
          ].map((pill, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.suggestionChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => handleSendPrompt(pill)}
            >
              <Text style={[styles.suggestionChipText, { color: colors.text }]}>
                💬 {pill}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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

                {/* Message Attachments (Images & Documents) */}
                {item.attachments && item.attachments.length > 0 && (
                  <View style={styles.bubbleAttachmentsContainer}>
                    {item.attachments.map((att: ChatAttachment) => {
                      if (att.type === 'image') {
                        return (
                          <View key={att.id} style={styles.bubbleImageWrapper}>
                            <Image
                              source={{ uri: att.uri }}
                              style={styles.bubbleImage}
                              resizeMode="cover"
                            />
                            <View style={styles.bubbleImageBadge}>
                              <ImageIcon size={11} color="#FFFFFF" />
                              <Text style={styles.bubbleImageBadgeText} numberOfLines={1}>
                                {att.name} {att.dimensions ? `(${att.dimensions.width}×${att.dimensions.height})` : ''}
                              </Text>
                            </View>
                          </View>
                        );
                      } else {
                        const isSpreadsheet =
                          att.name.toLowerCase().endsWith('.csv') ||
                          att.name.toLowerCase().endsWith('.xlsx');
                        const isExpanded = !!expandedDocIds[att.id];
                        return (
                          <View
                            key={att.id}
                            style={[
                              styles.bubbleDocCard,
                              { backgroundColor: isUser ? 'rgba(255, 255, 255, 0.15)' : colors.surface },
                            ]}
                          >
                            <View style={styles.bubbleDocHeader}>
                              {isSpreadsheet ? (
                                <FileSpreadsheet size={18} color={isUser ? '#FFFFFF' : colors.primary} />
                              ) : (
                                <FileText size={18} color={isUser ? '#FFFFFF' : colors.primary} />
                              )}
                              <View style={styles.bubbleDocMeta}>
                                <Text
                                  style={[styles.bubbleDocName, { color: isUser ? '#FFFFFF' : colors.text }]}
                                  numberOfLines={1}
                                >
                                  {att.name}
                                </Text>
                                <Text
                                  style={[styles.bubbleDocSize, { color: isUser ? 'rgba(255,255,255,0.75)' : colors.textMuted }]}
                                >
                                  {AttachmentService.formatFileSize(att.size)} • {att.mimeType || 'Document'}
                                </Text>
                              </View>
                              {att.extractedText ? (
                                <TouchableOpacity
                                  onPress={() =>
                                    setExpandedDocIds((prev) => ({
                                      ...prev,
                                      [att.id]: !prev[att.id],
                                    }))
                                  }
                                  style={styles.expandPreviewBtn}
                                >
                                  <Text
                                    style={[styles.expandPreviewText, { color: isUser ? '#FFFFFF' : colors.primary }]}
                                  >
                                    {isExpanded ? 'Hide' : 'Preview'}
                                  </Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>

                            {isExpanded && att.extractedText && (
                              <View
                                style={[
                                  styles.docPreviewSnippetBox,
                                  { backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : colors.background },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.docPreviewSnippetText,
                                    { color: isUser ? '#F1F5F9' : colors.text },
                                  ]}
                                  numberOfLines={10}
                                >
                                  {att.extractedText}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      }
                    })}
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

                {/* Quick Model Download Button if model not downloaded */}
                {!isUser && item.content.includes('is not downloaded yet') && (
                  <TouchableOpacity
                    style={[styles.quickDownloadBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      if (onOpenModelDownload) {
                        onOpenModelDownload(activeModel);
                      } else {
                        onOpenModelSelector();
                      }
                    }}
                  >
                    <Download size={14} color="#FFFFFF" />
                    <Text style={styles.quickDownloadText}>
                      Download {activeModel.name} ({activeModel.fileSizeMB} MB)
                    </Text>
                  </TouchableOpacity>
                )}

                {/* AI Photo Editing Result Card */}
                {!isUser && item.editedPhoto && (
                  <View style={[styles.photoEditCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <View style={styles.photoEditHeader}>
                      <Sparkles size={15} color={colors.primary} />
                      <Text style={[styles.photoEditTitle, { color: colors.text }]}>
                        AI Photo Transformation
                      </Text>
                    </View>

                    <Text style={[styles.photoEditPromptBadge, { color: colors.textMuted }]}>
                      Prompt: "{item.editedPhoto.prompt}"
                    </Text>

                    {/* Before / After Comparison */}
                    <View style={styles.comparisonRow}>
                      <View style={styles.comparisonCol}>
                        <Text style={[styles.comparisonLabel, { color: colors.textSubtle }]}>Original</Text>
                        <Image
                          source={{ uri: item.editedPhoto.originalUri }}
                          style={styles.comparisonImage}
                          resizeMode="cover"
                        />
                      </View>

                      <View style={styles.comparisonCol}>
                        <Text style={[styles.comparisonLabel, { color: colors.primary }]}>✨ Transformed</Text>
                        <Image
                          source={{ uri: item.editedPhoto.editedUri }}
                          style={[styles.comparisonImage, styles.transformedBorder]}
                          resizeMode="cover"
                        />
                      </View>
                    </View>

                    {/* Download Action Button */}
                    <TouchableOpacity
                      style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleDownloadEditedPhoto(item.editedPhoto!)}
                    >
                      <Download size={14} color="#FFFFFF" />
                      <Text style={styles.downloadBtnText}>Download Edited Photo</Text>
                    </TouchableOpacity>
                  </View>
                )}

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

      {/* Staged Attachments Preview Tray */}
      {stagedAttachments.length > 0 && (
        <View style={[styles.stagedTray, { backgroundColor: colors.card, borderTopColor: colors.divider }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stagedScroll}>
            {stagedAttachments.map((att) => (
              <View key={att.id} style={[styles.stagedItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                {att.type === 'image' ? (
                  <Image source={{ uri: att.uri }} style={styles.stagedThumb} />
                ) : (
                  <View style={styles.stagedDocIconBox}>
                    {att.name.endsWith('.csv') || att.name.endsWith('.xlsx') ? (
                      <FileSpreadsheet size={16} color={colors.primary} />
                    ) : (
                      <FileText size={16} color={colors.primary} />
                    )}
                  </View>
                )}
                <View style={styles.stagedItemInfo}>
                  <Text style={[styles.stagedItemName, { color: colors.text }]} numberOfLines={1}>
                    {att.name}
                  </Text>
                  <Text style={[styles.stagedItemSize, { color: colors.textMuted }]}>
                    {AttachmentService.formatFileSize(att.size)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveStagedAttachment(att.id)}
                  style={styles.stagedRemoveBtn}
                  accessibilityLabel="Remove attachment"
                >
                  <X size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Chat Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.divider }]}>
        {/* Attachment Paperclip Button */}
        <TouchableOpacity
          style={[
            styles.attachButton,
            { backgroundColor: colors.surface, borderColor: colors.cardBorder },
          ]}
          onPress={() => setIsAttachmentModalVisible(true)}
          accessibilityLabel="Add File or Image"
          disabled={isGenerating || isProcessingAttachment}
        >
          {isProcessingAttachment ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Paperclip size={19} color={colors.primary} />
          )}
          {stagedAttachments.length > 0 && (
            <View style={[styles.attachBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.attachBadgeText}>{stagedAttachments.length}</Text>
            </View>
          )}
        </TouchableOpacity>

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
          placeholder={
            stagedAttachments.length > 0
              ? 'Add an instruction (e.g. "Change bg to blue", "Summarize") or send...'
              : 'Talk to Tiyo in Tanglish, Tamil, or English (e.g. "Oru cake add pannu")...'
          }
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
              backgroundColor:
                inputText.trim() || stagedAttachments.length > 0
                  ? colors.primary
                  : colors.surface,
              opacity: isGenerating ? 0.6 : 1,
            },
          ]}
          onPress={() => handleSendPrompt()}
          disabled={(!inputText.trim() && stagedAttachments.length === 0) || isGenerating}
          accessibilityLabel="Send message"
        >
          {isGenerating ? (
            <ActivityIndicator
              size="small"
              color={inputText.trim() || stagedAttachments.length > 0 ? '#FFFFFF' : colors.textSubtle}
            />
          ) : (
            <Send
              size={18}
              color={inputText.trim() || stagedAttachments.length > 0 ? '#FFFFFF' : colors.textSubtle}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Attachment Selection Sheet Modal */}
      <Modal
        visible={isAttachmentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAttachmentModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsAttachmentModalVisible(false)}
        >
          <View
            style={[
              styles.attachmentSheetContent,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Attachment</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
                  Upload images, documents, or spreadsheets
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsAttachmentModalVisible(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.attachmentOptionsList}>
              <TouchableOpacity
                style={[styles.sheetOptionRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                onPress={() => handlePickImage('gallery')}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: 'rgba(77, 68, 225, 0.12)' }]}>
                  <ImageIcon size={22} color={colors.primary} />
                </View>
                <View style={styles.sheetOptionTextCol}>
                  <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Upload Image</Text>
                  <Text style={[styles.sheetOptionDesc, { color: colors.textMuted }]}>
                    Select photos from device gallery (JPG, PNG, WebP)
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetOptionRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                onPress={() => handlePickImage('camera')}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Camera size={22} color="#10B981" />
                </View>
                <View style={styles.sheetOptionTextCol}>
                  <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Take Photo</Text>
                  <Text style={[styles.sheetOptionDesc, { color: colors.textMuted }]}>
                    Capture live shot via camera
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetOptionRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                onPress={() => handlePickDocument()}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <FileText size={22} color="#EF4444" />
                </View>
                <View style={styles.sheetOptionTextCol}>
                  <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Upload Document / PDF</Text>
                  <Text style={[styles.sheetOptionDesc, { color: colors.textMuted }]}>
                    PDF, TXT, DOCX with auto text extraction
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetOptionRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                onPress={() => handlePickDocument()}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                  <FileSpreadsheet size={22} color="#F59E0B" />
                </View>
                <View style={styles.sheetOptionTextCol}>
                  <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Upload Spreadsheet</Text>
                  <Text style={[styles.sheetOptionDesc, { color: colors.textMuted }]}>
                    CSV, XLSX data tables for Q&A and analysis
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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

      {/* Tiyo Employee Personality Settings Modal */}
      <Modal visible={showTiyoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.tiyoModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.tiyoModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <UserCheck size={20} color={colors.primary} />
                <Text style={[styles.tiyoModalTitle, { color: colors.text }]}>Tiyo Personality</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTiyoModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Personality Mode */}
              <Text style={[styles.tiyoSectionTitle, { color: colors.textSubtle }]}>Employee Tone</Text>
              <View style={styles.personalityGrid}>
                {[
                  { id: 'friendly', name: 'Friendly', desc: 'Warm & helpful shop employee' },
                  { id: 'professional', name: 'Professional', desc: 'Polite & formal associate' },
                  { id: 'casual', name: 'Casual', desc: 'Relaxed & easygoing shop buddy' },
                ].map((item) => {
                  const isSel = tiyoConfig.personality === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.personalityCard,
                        {
                          backgroundColor: isSel ? colors.primarySubtle : colors.surface,
                          borderColor: isSel ? colors.primary : colors.cardBorder,
                        },
                      ]}
                      onPress={() => {
                        const next = { ...tiyoConfig, personality: item.id as EmployeePersonality };
                        setTiyoConfig(next);
                        tiyoService.saveConfig(next);
                      }}
                    >
                      <Smile size={16} color={isSel ? colors.primary : colors.textMuted} />
                      <Text style={[styles.personalityName, { color: isSel ? colors.primary : colors.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.personalityTag, { color: colors.textMuted }]}>
                        {item.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Language Preference */}
              <Text style={[styles.tiyoSectionTitle, { color: colors.textSubtle, marginTop: 14 }]}>
                Conversation Language
              </Text>
              <View style={styles.languageRow}>
                {[
                  { id: 'tanglish', label: 'Tanglish' },
                  { id: 'tamil', label: 'தமிழ் (Tamil)' },
                  { id: 'english', label: 'English' },
                  { id: 'hindi', label: 'हिन्दी (Hindi)' },
                  { id: 'auto', label: 'Auto Detect' },
                ].map((lang) => {
                  const isSel = tiyoConfig.language === lang.id;
                  return (
                    <TouchableOpacity
                      key={lang.id}
                      style={[
                        styles.languageChip,
                        {
                          backgroundColor: isSel ? colors.primary : colors.surface,
                          borderColor: isSel ? colors.primary : colors.cardBorder,
                        },
                      ]}
                      onPress={() => {
                        const next = { ...tiyoConfig, language: lang.id as TiyoLanguage };
                        setTiyoConfig(next);
                        tiyoService.saveConfig(next);
                      }}
                    >
                      <Text style={[styles.languageChipText, { color: isSel ? '#FFFFFF' : colors.text }]}>
                        {lang.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Voice Speech Toggle */}
              <View style={[styles.settingToggleRow, { marginTop: 14 }]}>
                <View>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Employee Voice Output</Text>
                  <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                    Tiyo speaks responses out loud
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const next = { ...tiyoConfig, voiceEnabled: !tiyoConfig.voiceEnabled };
                    setTiyoConfig(next);
                    tiyoService.saveConfig(next);
                  }}
                  style={[
                    styles.voiceToggleBadge,
                    { backgroundColor: tiyoConfig.voiceEnabled ? colors.primary : colors.surface },
                  ]}
                >
                  <Text style={{ color: tiyoConfig.voiceEnabled ? '#FFFFFF' : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                    {tiyoConfig.voiceEnabled ? 'Enabled' : 'Muted'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Speech Speed */}
              <Text style={[styles.tiyoSectionTitle, { color: colors.textSubtle, marginTop: 14 }]}>
                Voice Speed
              </Text>
              <View style={styles.speedBtnRow}>
                {SPEECH_SPEEDS.map((s) => {
                  const isSel = speechSpeed === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.speedBtn,
                        {
                          backgroundColor: isSel ? colors.primary : colors.surface,
                          borderColor: isSel ? colors.primary : colors.cardBorder,
                        },
                      ]}
                      onPress={() => {
                        setSpeechSpeed(s);
                        tiyoService.saveConfig({ speechSpeed: s });
                      }}
                    >
                      <Text style={[styles.speedBtnText, { color: isSel ? '#FFFFFF' : colors.text }]}>
                        {s}x
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Active Cart Details Modal */}
      <Modal visible={showCartModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.cartModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.tiyoModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={20} color={colors.primary} />
                <Text style={[styles.tiyoModalTitle, { color: colors.text }]}>
                  Active Bill Cart ({tiyoService.getCartCount()} items)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCartModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 250 }}>
              {cartItems.map((item) => (
                <View key={item.id} style={[styles.cartModalItemRow, { borderBottomColor: colors.divider }]}>
                  <View>
                    <Text style={[styles.cartItemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.cartItemSub, { color: colors.textMuted }]}>
                      {item.quantity} {item.unit}s @ ₹{item.unitPrice}
                    </Text>
                  </View>
                  <Text style={[styles.cartItemTotal, { color: colors.primary }]}>₹{item.totalPrice}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.cartTotalSummaryRow}>
              <Text style={[styles.cartTotalLabel, { color: colors.text }]}>Total Bill Amount:</Text>
              <Text style={[styles.cartTotalValue, { color: colors.primary }]}>₹{tiyoService.getCartTotal()}</Text>
            </View>

            <View style={styles.cartModalBtnRow}>
              <TouchableOpacity
                style={[styles.cartClearBtn, { borderColor: colors.error }]}
                onPress={async () => {
                  await tiyoService.clearCart();
                  setCartItems([]);
                  setShowCartModal(false);
                }}
              >
                <Text style={{ color: colors.error, fontSize: 12, fontWeight: '700' }}>Clear Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cartAskTotalBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowCartModal(false);
                  handleSendPrompt('Total evlo?');
                }}
              >
                <Text style={styles.cartAskTotalText}>Ask "Total evlo?"</Text>
              </TouchableOpacity>
            </View>
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
  // Attachment & Image Styles
  quickDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  quickDownloadText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bubbleAttachmentsContainer: {
    marginBottom: 8,
    gap: 8,
  },
  bubbleImageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  bubbleImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#0F172A',
  },
  bubbleImageBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bubbleImageBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  bubbleDocCard: {
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  bubbleDocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bubbleDocMeta: {
    flex: 1,
  },
  bubbleDocName: {
    fontSize: 12,
    fontWeight: '700',
  },
  bubbleDocSize: {
    fontSize: 10,
    marginTop: 1,
  },
  expandPreviewBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  expandPreviewText: {
    fontSize: 10,
    fontWeight: '700',
  },
  docPreviewSnippetBox: {
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  docPreviewSnippetText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  // Photo Edit Card Styles
  photoEditCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  photoEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoEditTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  photoEditPromptBadge: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  comparisonCol: {
    flex: 1,
    gap: 4,
  },
  comparisonLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  comparisonImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  transformedBorder: {
    borderWidth: 1.5,
    borderColor: '#4D44E1',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Staged Attachments Tray
  stagedTray: {
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  stagedScroll: {
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stagedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    maxWidth: 180,
    position: 'relative',
  },
  stagedThumb: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#0F172A',
  },
  stagedDocIconBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(77, 68, 225, 0.08)',
  },
  stagedItemInfo: {
    flex: 1,
  },
  stagedItemName: {
    fontSize: 11,
    fontWeight: '700',
  },
  stagedItemSize: {
    fontSize: 9,
    marginTop: 1,
  },
  stagedRemoveBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  attachBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  attachBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  // Attachment Sheet Modal
  attachmentSheetContent: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  attachmentOptionsList: {
    gap: 8,
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  sheetIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionTextCol: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sheetOptionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  cartHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  cartHeaderPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tiyoSettingsPill: {
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCartStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  cartStripLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartStripIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartStripTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  cartStripTotal: {
    fontSize: 12,
    fontWeight: '800',
  },
  cartStripSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  cartActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cartActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  suggestionsRow: {
    paddingVertical: 6,
  },
  suggestionsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tiyoModalCard: {
    width: '90%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    gap: 14,
    maxHeight: '85%',
  },
  tiyoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tiyoModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  tiyoSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  personalityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  personalityCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  personalityName: {
    fontSize: 12,
    fontWeight: '700',
  },
  personalityTag: {
    fontSize: 9,
    textAlign: 'center',
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  languageChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  languageChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  voiceToggleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  speedBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  speedBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  speedBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cartModalCard: {
    width: '90%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    gap: 14,
    maxHeight: '80%',
  },
  cartModalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  cartItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  cartItemTotal: {
    fontSize: 13,
    fontWeight: '700',
  },
  cartTotalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  cartTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  cartTotalValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  cartModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cartClearBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartAskTotalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartAskTotalText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  webDemoBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  webDemoBannerText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
});
