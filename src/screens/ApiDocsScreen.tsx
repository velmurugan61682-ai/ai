import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  BookOpen,
  Copy,
  Check,
  Code2,
  Lock,
  Zap,
  AlertCircle,
  ArrowLeft,
  Terminal,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { ThemeColors } from '../theme/theme';

interface ApiDocsScreenProps {
  colors: ThemeColors;
  onBack: () => void;
}

export const ApiDocsScreen: React.FC<ApiDocsScreenProps> = ({ colors, onBack }) => {
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const CURL_MODELS_EXAMPLE = `curl -X GET "https://ai-mocha-two-35.vercel.app/api/v1/models" \\
  -H "Authorization: Bearer sab_live_your_api_key_here"`;

  const CURL_CHAT_EXAMPLE = `curl -X POST "https://ai-mocha-two-35.vercel.app/api/v1/chat/completions" \\
  -H "Authorization: Bearer sab_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "qwen3-0.6b",
    "messages": [
      { "role": "user", "content": "Explain inventory reorder point." }
    ],
    "temperature": 0.7
  }'`;

  const JS_EXAMPLE = `const response = await fetch("https://ai-mocha-two-35.vercel.app/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sab_live_your_api_key_here",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "qwen3-0.6b",
    messages: [{ role: "user", content: "Rendu Pepsi add pannu." }]
  })
});
const data = await response.json();
console.log(data.choices[0].message.content);`;

  const PYTHON_EXAMPLE = `import requests

url = "https://ai-mocha-two-35.vercel.app/api/v1/chat/completions"
headers = {
    "Authorization": "Bearer sab_live_your_api_key_here",
    "Content-Type": "application/json"
}
payload = {
    "model": "qwen3-0.6b",
    "messages": [{"role": "user", "content": "Hello SaaS AI Brain"}]
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Developer API Documentation"
        subtitle="REST API reference & code integration examples"
        colors={colors}
        leftAction={
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Lock size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Authentication</Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            All API requests must include your generated secret API key in the HTTP{' '}
            <Text style={{ fontWeight: '700', color: colors.text }}>Authorization</Text> header using the{' '}
            <Text style={{ fontWeight: '700', color: colors.text }}>Bearer</Text> scheme.
          </Text>

          <View style={[styles.codeBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.codeText, { color: colors.primary }]}>
              Authorization: Bearer sab_live_YOUR_API_KEY
            </Text>
          </View>
        </View>

        {/* Rate Limiting */}
        <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Zap size={18} color="#D97706" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Rate Limits</Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            API keys are rate limited to <Text style={{ fontWeight: '700', color: colors.text }}>60 requests per minute</Text>.
            Rate limit headers are returned in every response:
          </Text>
          <View style={[styles.codeBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.codeText, { color: colors.textMuted }]}>
              X-RateLimit-Limit: 60{'\n'}
              X-RateLimit-Remaining: 59{'\n'}
              X-RateLimit-Reset: 1730612400
            </Text>
          </View>
        </View>

        {/* Endpoint 1: List Models */}
        <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.httpBadgeGet}>
              <Text style={styles.httpBadgeGetText}>GET</Text>
            </View>
            <Text style={[styles.endpointPath, { color: colors.text }]}>/api/v1/models</Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            Retrieves the list of available quantized on-device SLMs with memory requirements and parameter sizes.
          </Text>

          <View style={[styles.codeSnippetHeader, { backgroundColor: colors.surface }]}>
            <Text style={[styles.snippetLangText, { color: colors.textSubtle }]}>cURL</Text>
            <TouchableOpacity onPress={() => handleCopy('models_curl', CURL_MODELS_EXAMPLE)}>
              {copiedSnippetId === 'models_curl' ? (
                <Check size={14} color={colors.success} />
              ) : (
                <Copy size={14} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
          <View style={[styles.codeBox, { backgroundColor: '#111827' }]}>
            <Text style={[styles.codeBlockText, { color: '#E5E7EB' }]}>{CURL_MODELS_EXAMPLE}</Text>
          </View>
        </View>

        {/* Endpoint 2: Chat Completions */}
        <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.httpBadgePost}>
              <Text style={styles.httpBadgePostText}>POST</Text>
            </View>
            <Text style={[styles.endpointPath, { color: colors.text }]}>/api/v1/chat/completions</Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            Executes AI inference. Supports English, Tamil, and Tanglish conversational prompts.
          </Text>

          <View style={[styles.codeSnippetHeader, { backgroundColor: colors.surface }]}>
            <Text style={[styles.snippetLangText, { color: colors.textSubtle }]}>cURL</Text>
            <TouchableOpacity onPress={() => handleCopy('chat_curl', CURL_CHAT_EXAMPLE)}>
              {copiedSnippetId === 'chat_curl' ? (
                <Check size={14} color={colors.success} />
              ) : (
                <Copy size={14} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
          <View style={[styles.codeBox, { backgroundColor: '#111827' }]}>
            <Text style={[styles.codeBlockText, { color: '#E5E7EB' }]}>{CURL_CHAT_EXAMPLE}</Text>
          </View>
        </View>

        {/* JavaScript Example */}
        <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Code2 size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>JavaScript / Node.js</Text>
          </View>
          <View style={[styles.codeSnippetHeader, { backgroundColor: colors.surface }]}>
            <Text style={[styles.snippetLangText, { color: colors.textSubtle }]}>Node.js Fetch</Text>
            <TouchableOpacity onPress={() => handleCopy('js_snippet', JS_EXAMPLE)}>
              {copiedSnippetId === 'js_snippet' ? (
                <Check size={14} color={colors.success} />
              ) : (
                <Copy size={14} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
          <View style={[styles.codeBox, { backgroundColor: '#111827' }]}>
            <Text style={[styles.codeBlockText, { color: '#E5E7EB' }]}>{JS_EXAMPLE}</Text>
          </View>
        </View>

        {/* Python Example */}
        <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Terminal size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Python Integration</Text>
          </View>
          <View style={[styles.codeSnippetHeader, { backgroundColor: colors.surface }]}>
            <Text style={[styles.snippetLangText, { color: colors.textSubtle }]}>requests</Text>
            <TouchableOpacity onPress={() => handleCopy('python_snippet', PYTHON_EXAMPLE)}>
              {copiedSnippetId === 'python_snippet' ? (
                <Check size={14} color={colors.success} />
              ) : (
                <Copy size={14} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
          <View style={[styles.codeBox, { backgroundColor: '#111827' }]}>
            <Text style={[styles.codeBlockText, { color: '#E5E7EB' }]}>{PYTHON_EXAMPLE}</Text>
          </View>
        </View>

        {/* Error Codes */}
        <View style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <AlertCircle size={18} color={colors.error} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Error Status Codes</Text>
          </View>

          <View style={styles.errorItem}>
            <Text style={[styles.errorCode, { color: colors.error }]}>401 Unauthorized</Text>
            <Text style={[styles.errorDesc, { color: colors.textMuted }]}>
              Missing API key, or key has invalid syntax.
            </Text>
          </View>

          <View style={styles.errorItem}>
            <Text style={[styles.errorCode, { color: colors.error }]}>403 Forbidden</Text>
            <Text style={[styles.errorDesc, { color: colors.textMuted }]}>
              API key has been revoked or expired.
            </Text>
          </View>

          <View style={styles.errorItem}>
            <Text style={[styles.errorCode, { color: '#D97706' }]}>429 Too Many Requests</Text>
            <Text style={[styles.errorDesc, { color: colors.textMuted }]}>
              Rate limit exceeded (maximum 60 req/min).
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  docCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  endpointPath: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  httpBadgeGet: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  httpBadgeGetText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '800',
  },
  httpBadgePost: {
    backgroundColor: '#EEF0FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  httpBadgePostText: {
    color: '#4D44E1',
    fontSize: 11,
    fontWeight: '800',
  },
  codeSnippetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  snippetLangText: {
    fontSize: 11,
    fontWeight: '700',
  },
  codeBox: {
    padding: 12,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  codeBlockText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorItem: {
    paddingVertical: 4,
    gap: 2,
  },
  errorCode: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorDesc: {
    fontSize: 12,
  },
});

