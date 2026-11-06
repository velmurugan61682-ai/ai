import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  RotateCcw,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';
import { ThemeColors } from '../theme/theme';
import {
  TiyoAvatar,
  TiyoActionEngine,
  TiyoVoiceOut,
  TiyoVoiceIn,
  getTiyoBrain,
  TiyoMessage,
  TiyoAction,
  TiyoEmotion,
  TiyoModelStatus,
} from '../tiyo';

export interface TiyoScreenProps {
  colors: ThemeColors;
}

export const TiyoScreen: React.FC<TiyoScreenProps> = ({ colors }) => {
  // Engine & service instances
  const brain = useRef(getTiyoBrain()).current;
  const actionEngine = useRef(new TiyoActionEngine()).current;
  const voiceOut = useRef(TiyoVoiceOut.getInstance()).current;
  const voiceIn = useRef(TiyoVoiceIn.getInstance()).current;

  // UI State
  const [messages, setMessages] = useState<TiyoMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        "Hello! I am Tiyo, your AI robot assistant. How can I help you today?",
      timestamp: Date.now(),
      action: 'wave',
      emotion: 'happy',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [tiyoState, setTiyoState] = useState(actionEngine.getState());
  const [currentAction, setCurrentAction] = useState<TiyoAction>(actionEngine.getAction());
  const [currentEmotion, setCurrentEmotion] = useState<TiyoEmotion>(actionEngine.getEmotion());
  const [modelStatus, setModelStatus] = useState<TiyoModelStatus>(brain.getStatus());
  const [statusMessage, setStatusMessage] = useState(brain.getStatusMessage());
  const [downloadProgress, setDownloadProgress] = useState(brain.getDownloadProgress());
  const [mouthRatio, setMouthRatio] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [speedRate, setSpeedRate] = useState(voiceOut.getSpeed());

  const scrollViewRef = useRef<ScrollView>(null);

  // Subscribe to action engine state changes
  useEffect(() => {
    const unsub = actionEngine.subscribe((state, action, emotion) => {
      setTiyoState(state);
      setCurrentAction(action);
      setCurrentEmotion(emotion);
    });
    return unsub;
  }, [actionEngine]);

  // Periodic model status refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setModelStatus(brain.getStatus());
      setStatusMessage(brain.getStatusMessage());
      setDownloadProgress(brain.getDownloadProgress());
    }, 1000);
    return () => clearInterval(interval);
  }, [brain]);

  // Handle Model Download
  const handleDownload = async () => {
    try {
      await brain.downloadModel((progress) => {
        setDownloadProgress(progress);
        setModelStatus(brain.getStatus());
        setStatusMessage(brain.getStatusMessage());
      });
      setModelStatus(brain.getStatus());
      setStatusMessage(brain.getStatusMessage());
    } catch (err: any) {
      Alert.alert('Download Error', err?.message || 'Could not download model.');
    }
  };

  // Speak a message
  const handleSpeak = async (text: string, emotion?: TiyoEmotion, action?: TiyoAction) => {
    actionEngine.startSpeaking(emotion);
    await voiceOut.speak(text, {
      rate: speedRate,
      onMouthMove: (ratio) => setMouthRatio(ratio),
      onDone: () => {
        setMouthRatio(0);
        actionEngine.playGesture(action || 'idle', emotion);
      },
      onStopped: () => {
        setMouthRatio(0);
        actionEngine.resetToIdle();
      },
      onError: () => {
        setMouthRatio(0);
        actionEngine.onError();
      },
    });
  };

  const handleStopSpeech = async () => {
    await voiceOut.stop();
    setMouthRatio(0);
    actionEngine.resetToIdle();
  };

  // Submit User Message
  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    // Stop speaking if active
    if (voiceOut.getIsSpeaking()) {
      await handleStopSpeech();
    }

    const userMsg: TiyoMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLiveTranscript('');

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    // Transition to thinking
    actionEngine.startThinking();

    try {
      const result = await brain.generateReply(
        query,
        messages,
        (token) => {
          // Streaming progress hook
        }
      );

      const assistantMsg: TiyoMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: Date.now(),
        action: result.action,
        emotion: result.emotion,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

      // Auto-speak response in English
      await handleSpeak(result.response, result.emotion, result.action);
    } catch (err: any) {
      actionEngine.onError();
      const errorMsg: TiyoMessage = {
        id: `assistant-err-${Date.now()}`,
        role: 'assistant',
        content: `Notice: ${err?.message || 'Inference could not complete.'}`,
        timestamp: Date.now(),
        action: 'idle',
        emotion: 'sad',
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  // Toggle Microphone
  const handleToggleMic = async () => {
    if (isListening) {
      await voiceIn.stopListening();
      setIsListening(false);
      actionEngine.resetToIdle();
      return;
    }

    // Stop any ongoing speech before listening
    if (voiceOut.getIsSpeaking()) {
      await handleStopSpeech();
    }

    actionEngine.startListening();
    setIsListening(true);
    setLiveTranscript('');

    await voiceIn.startListening({
      onStart: () => setIsListening(true),
      onTranscript: (transcript, isFinal) => {
        setLiveTranscript(transcript);
        if (isFinal && transcript.trim()) {
          voiceIn.stopListening();
          setIsListening(false);
          handleSend(transcript);
        }
      },
      onError: (err, isDenied) => {
        setIsListening(false);
        actionEngine.onError();
        if (isDenied) {
          Alert.alert(
            'Microphone Permission Required',
            err,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => voiceIn.openAppSettings() },
            ]
          );
        } else {
          Alert.alert('Voice Input', err);
        }
      },
      onEnd: () => {
        setIsListening(false);
        if (actionEngine.getState() === 'listening') {
          actionEngine.resetToIdle();
        }
      },
    });
  };

  // Speed adjustment (0.5x, 0.75x, 1.0x, 1.25x, 1.5x)
  const cycleSpeed = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
    const currentIndex = speeds.indexOf(speedRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    voiceOut.setSpeed(nextSpeed);
    setSpeedRate(nextSpeed);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: "Conversation restarted. I am ready to help you!",
        timestamp: Date.now(),
        action: 'greet',
        emotion: 'happy',
      },
    ]);
    actionEngine.resetToIdle();
  };

  const isModelReady = modelStatus === 'ready';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Top Runtime Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  modelStatus === 'ready'
                    ? '#10B981'
                    : modelStatus === 'downloading'
                    ? '#F59E0B'
                    : modelStatus === 'loading'
                    ? '#6366F1'
                    : '#EF4444',
              },
            ]}
          />
          <Text style={[styles.statusText, { color: colors.text }]}>
            {statusMessage}
          </Text>
        </View>

        <View style={styles.topControls}>
          <TouchableOpacity style={[styles.badgeBtn, { backgroundColor: colors.surface }]} onPress={cycleSpeed}>
            <Text style={[styles.badgeBtnText, { color: colors.primary }]}>{speedRate}x Speed</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.badgeBtn, { backgroundColor: colors.surface }]} onPress={handleClearHistory}>
            <RotateCcw size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Model Download Progress Card if not downloaded or downloading */}
      {!isModelReady && Platform.OS === 'android' && (
        <View style={[styles.downloadCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          <View style={styles.downloadCardHeader}>
            <DownloadCloud size={20} color={colors.primary} />
            <Text style={[styles.downloadCardTitle, { color: colors.text }]}>
              Qwen3-0.6B On-Device Model (639 MB)
            </Text>
          </View>
          <Text style={[styles.downloadCardDesc, { color: colors.textMuted }]}>
            Download official Qwen3 weights to run offline on your device with zero internet.
          </Text>

          {modelStatus === 'downloading' ? (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBarBg, { backgroundColor: colors.card }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { backgroundColor: colors.primary, width: `${downloadProgress}%` },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textMuted }]}>
                {downloadProgress}%
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
              onPress={handleDownload}
            >
              <Text style={styles.downloadBtnText}>Download Model</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Central 2D Animated Robot Avatar */}
      <View style={styles.avatarSection}>
        <TiyoAvatar
          state={tiyoState}
          action={currentAction}
          emotion={currentEmotion}
          colors={colors}
          size={190}
          mouthOpenRatio={mouthRatio}
        />

        {/* State Label Pill */}
        <View style={[styles.statePill, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          <Sparkles size={12} color={colors.primary} />
          <Text style={[styles.statePillText, { color: colors.text }]}>
            State: <Text style={{ fontWeight: '700', color: colors.primary }}>{tiyoState.toUpperCase()}</Text>
            {currentAction !== 'idle' ? ` · Gesture: ${currentAction}` : ''}
          </Text>
        </View>
      </View>

      {/* Chat Messages List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatList}
        contentContainerStyle={styles.chatListContent}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === 'user'
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.divider }],
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { color: msg.role === 'user' ? '#FFFFFF' : colors.text },
              ]}
            >
              {msg.content}
            </Text>

            {msg.role === 'assistant' && (
              <TouchableOpacity
                style={styles.speakIconBtn}
                onPress={() => handleSpeak(msg.content, msg.emotion, msg.action)}
              >
                <Volume2 size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Live speech transcription display */}
        {isListening && liveTranscript ? (
          <View style={[styles.liveTranscriptCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.liveTranscriptLabel, { color: colors.primary }]}>Listening...</Text>
            <Text style={[styles.liveTranscriptText, { color: colors.text }]}>{liveTranscript}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Speech Control Banner when Speaking */}
      {tiyoState === 'speaking' && (
        <View style={[styles.speakingBanner, { backgroundColor: colors.card, borderTopColor: colors.divider }]}>
          <Text style={[styles.speakingText, { color: colors.primary }]}>Tiyo is speaking...</Text>
          <TouchableOpacity style={styles.stopSpeechBtn} onPress={handleStopSpeech}>
            <VolumeX size={16} color="#FFFFFF" />
            <Text style={styles.stopSpeechText}>Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.divider }]}>
        <TouchableOpacity
          style={[
            styles.micBtn,
            {
              backgroundColor: isListening ? '#EF4444' : colors.surface,
              borderColor: colors.divider,
            },
          ]}
          onPress={handleToggleMic}
        >
          {isListening ? (
            <MicOff size={20} color="#FFFFFF" />
          ) : (
            <Mic size={20} color={colors.primary} />
          )}
        </TouchableOpacity>

        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.divider,
            },
          ]}
          placeholder="Talk to Tiyo in English..."
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: inputText.trim() ? colors.primary : colors.surface },
          ]}
          disabled={!inputText.trim()}
          onPress={() => handleSend()}
        >
          <Send
            size={18}
            color={inputText.trim() ? '#FFFFFF' : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  downloadCard: {
    margin: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  downloadCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  downloadCardDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  downloadBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
  },
  statePillText: {
    fontSize: 11,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  speakIconBtn: {
    alignSelf: 'flex-end',
    marginTop: 6,
    padding: 2,
  },
  liveTranscriptCard: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 4,
  },
  liveTranscriptLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  liveTranscriptText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  speakingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  speakingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stopSpeechBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stopSpeechText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  micBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

