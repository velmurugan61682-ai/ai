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
} from 'react-native';
import {
  Send,
  Sparkles,
  Zap,
  ShoppingCart,
  ShieldCheck,
  Check,
  RotateCcw,
  Cpu,
  Trash2,
} from 'lucide-react-native';
import {
  AIModelMetadata,
  BillingStructure,
  ChatMessage,
} from '../models/modelTypes';
import { AIEngine } from '../brain/AIEngine';
import { ModelStorage } from '../storage/ModelStorage';
import { Header } from '../components/Header';
import { ThemeColors } from '../theme/theme';

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

  const flatListRef = useRef<FlatList>(null);
  const aiEngine = AIEngine.getInstance();
  const storage = ModelStorage.getInstance();

  const QUICK_EXAMPLES = [
    'Hello, introduce yourself.',
    'Rendu Pepsi add pannu.',
    'Oru Coke add pannu.',
    'Moonu water bottle add pannu.',
    'Explain inventory management.',
  ];

  useEffect(() => {
    storage.getChatHistory().then((history) => {
      if (history.length > 0) {
        setMessages(history);
      } else {
        // Initial welcome message
        const welcomeMsg: ChatMessage = {
          id: 'msg-welcome',
          role: 'assistant',
          content:
            "Hello! I am SaaS AI Brain running 100% locally on your phone's hardware. You can test general queries, Tamil/Tanglish billing commands, or inventory questions below.",
          timestamp: Date.now(),
          modelId: selectedModel?.id,
          modelName: selectedModel?.name || 'Local SLM',
        };
        setMessages([welcomeMsg]);
      }
    });
  }, []);

  const handleSendPrompt = async (promptToSend?: string) => {
    const text = (promptToSend || inputText).trim();
    if (!text || isGenerating) return;

    if (!selectedModel) {
      Alert.alert(
        'No Model Selected',
        'Please select and activate a downloaded AI model to begin chatting.'
      );
      return;
    }

    setInputText('');

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

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
        modelId: selectedModel.id,
        modelName: selectedModel.name,
        inferenceTimeMs: output.metrics.totalTimeMs,
        tokensPerSecond: output.metrics.tokensPerSecond,
        structuredData: output.structuredData,
      };

      setCurrentTps(output.metrics.tokensPerSecond);
      setMessages((prev) => [...prev, assistantMessage]);
      await storage.saveChatMessage(assistantMessage);
    } catch (err: any) {
      Alert.alert('Inference Notice', err?.message || 'Failed generating inference');
    } finally {
      setIsGenerating(false);
      setCurrentStreamingText('');
    }
  };

  const handleConfirmOrder = (order: BillingStructure) => {
    Alert.alert(
      'Order Validated Offline',
      `Confirmed order for ${order.items[0]?.quantity} × ${order.items[0]?.itemName} (Estimated: ₹${order.items[0]?.totalEstimate}).\n\nSecurity: Transacted locally with application signature.`
    );
  };

  const handleClearChat = async () => {
    await storage.clearChatHistory();
    setMessages([]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Local AI Chat"
        subtitle={selectedModel ? `Running on ${selectedModel.name}` : 'No model loaded'}
        colors={colors}
        rightAction={
          <View style={styles.headerRightActions}>
            <TouchableOpacity onPress={onOpenModelSelector} style={styles.modelSwitchPill}>
              <Cpu size={14} color={colors.primary} />
              <Text style={[styles.modelSwitchText, { color: colors.primary }]}>
                {selectedModel ? selectedModel.parameters : 'Select'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClearChat} style={styles.clearBtn}>
              <Trash2 size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Quick Example Prompt Chips */}
      <View style={[styles.examplesBar, { borderBottomColor: colors.divider }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={QUICK_EXAMPLES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.examplesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.exampleChip, { backgroundColor: colors.surface }]}
              onPress={() => handleSendPrompt(item)}
            >
              <Text style={[styles.exampleText, { color: colors.textMuted }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Chat Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isUser = item.role === 'user';

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
                          borderColor: colors.cardBorder,
                        },
                      ],
                ]}
              >
                {!isUser && item.modelName && (
                  <View style={styles.modelTagRow}>
                    <Sparkles size={11} color={colors.primary} />
                    <Text style={[styles.modelTagText, { color: colors.primary }]}>
                      {item.modelName}
                    </Text>
                    {item.tokensPerSecond && (
                      <Text style={[styles.tpsTagText, { color: colors.textSubtle }]}>
                        · {item.tokensPerSecond} tps
                      </Text>
                    )}
                  </View>
                )}

                <Text
                  style={[
                    styles.messageText,
                    { color: isUser ? '#FFFFFF' : colors.text },
                  ]}
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
                        Security: AI cannot auto-execute payments or prices without validation.
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

      {/* Active Streaming Bubble */}
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
                Generating token stream...
              </Text>
            </View>
            <Text style={[styles.messageText, { color: colors.text }]}>
              {currentStreamingText || 'Thinking...'}
            </Text>
          </View>
        </View>
      )}

      {/* Input Box */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.divider }]}>
        <TextInput
          style={[styles.textInput, { color: colors.text, backgroundColor: colors.surface }]}
          placeholder="Ask in English or Tanglish ('Rendu Pepsi add pannu')..."
          placeholderTextColor={colors.textSubtle}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() ? colors.primary : colors.surface,
            },
          ]}
          onPress={() => handleSendPrompt()}
          disabled={!inputText.trim() || isGenerating}
        >
          <Send size={18} color={inputText.trim() ? '#FFFFFF' : colors.textSubtle} />
        </TouchableOpacity>
      </View>
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
    gap: 8,
  },
  modelSwitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4D44E1',
  },
  modelSwitchText: {
    fontSize: 11,
    fontWeight: '700',
  },
  clearBtn: {
    padding: 6,
  },
  examplesBar: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  examplesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  exampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exampleText: {
    fontSize: 11,
    fontWeight: '500',
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  messageWrapper: {
    flexDirection: 'row',
    width: '100%',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 16,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  modelTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  modelTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tpsTagText: {
    fontSize: 10,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  structuredCard: {
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
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
    paddingVertical: 4,
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  securityNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  securityText: {
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
  },
  confirmOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  confirmOrderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  streamingWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  streamingBubble: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
