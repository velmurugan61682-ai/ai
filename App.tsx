import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import {
  Brain,
  MessageSquare,
  Cpu,
  Layers,
  Activity,
  Settings,
  HardDrive,
  BarChart2,
  Key,
} from 'lucide-react-native';
import { lightTheme, darkTheme, ThemeColors } from './src/theme/theme';
import {
  AIModelMetadata,
  BenchmarkResult,
  DeviceHardwareInfo,
  ModelRuntimeState,
  RecommendationPreference,
} from './src/models/modelTypes';
import { INITIAL_AI_MODELS, getModelById } from './src/models/modelRegistry';
import { ModelStorage } from './src/storage/ModelStorage';
import { DeviceService } from './src/services/DeviceService';
import { ModelDownloader } from './src/services/ModelDownloader';
import { ModelSelector } from './src/brain/ModelSelector';
import { AIEngine } from './src/brain/AIEngine';

// Screens
import { SplashScreen } from './src/screens/SplashScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { DeviceDetectionScreen } from './src/screens/DeviceDetectionScreen';
import { DeviceDashboard } from './src/screens/DeviceDashboard';
import { BrainDashboard } from './src/screens/BrainDashboard';
import { ModelRegistryScreen } from './src/screens/ModelRegistryScreen';
import { ModelDownloadScreen } from './src/screens/ModelDownloadScreen';
import { ModelSelectionScreen } from './src/screens/ModelSelectionScreen';
import { AIChatScreen } from './src/screens/AIChatScreen';
import { BenchmarkScreen } from './src/screens/BenchmarkScreen';
import { PerformanceComparisonScreen } from './src/screens/PerformanceComparisonScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ApiKeysScreen } from './src/screens/ApiKeysScreen';
import { ApiDocsScreen } from './src/screens/ApiDocsScreen';

export type ScreenId =
  | 'Splash'
  | 'Welcome'
  | 'DeviceDetection'
  | 'DeviceDashboard'
  | 'BrainDashboard'
  | 'ModelRegistry'
  | 'ModelDownload'
  | 'ModelSelection'
  | 'AIChat'
  | 'Benchmark'
  | 'PerformanceComparison'
  | 'Settings'
  | 'ApiKeys'
  | 'ApiDocs';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('Splash');
  const [darkMode, setDarkMode] = useState(false);
  const [hardware, setHardware] = useState<DeviceHardwareInfo | null>(null);
  const [modelStates, setModelStates] = useState<Record<string, ModelRuntimeState>>({});
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [preference, setPreference] = useState<RecommendationPreference>('overall');
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);

  const storage = ModelStorage.getInstance();
  const deviceService = DeviceService.getInstance();
  const downloader = ModelDownloader.getInstance();
  const selector = ModelSelector.getInstance();

  const colors: ThemeColors = darkMode ? darkTheme : lightTheme;

  // Initial Data Load
  useEffect(() => {
    async function initAppData() {
      const savedDark = await storage.getDarkMode();
      setDarkMode(savedDark);

      const pref = await storage.getUserPreference();
      setPreference(pref);

      const states = await storage.getModelStates();
      setModelStates(states);

      const selectedId = await storage.getSelectedModelId();
      setSelectedModelId(selectedId);

      const bms = await storage.getBenchmarkResults();
      setBenchmarks(bms);

      const hw = await deviceService.getHardwareInfo();
      setHardware(hw);
    }
    initAppData();
  }, []);

  const refreshHardware = async () => {
    const hw = await deviceService.getHardwareInfo(true);
    setHardware(hw);
  };

  const handleDownloadModel = async (model: AIModelMetadata) => {
    try {
      Alert.alert(
        'Download Started',
        `Initiating verified GGUF download for ${model.name}. You can track progress in real-time.`
      );

      // Transition to download screen
      setCurrentScreen('ModelDownload');

      await downloader.startDownload(model, (progress, downloaded, total) => {
        setModelStates((prev) => ({
          ...prev,
          [model.id]: {
            modelId: model.id,
            status: progress >= 100 ? 'downloaded' : 'downloading',
            downloadProgress: progress,
            downloadedBytes: downloaded,
            totalBytes: total,
            localPath: storage.getModelPath(model.fileName),
          },
        }));
      });

      // Once finished, update state and auto-select if no model active
      const states = await storage.getModelStates();
      setModelStates(states);

      if (!selectedModelId) {
        await handleSelectModel(model.id);
      }

      Alert.alert('Download Complete', `${model.name} has been verified and stored on device.`);
    } catch (err: any) {
      const states = await storage.getModelStates();
      setModelStates(states);
      Alert.alert('Download Notice', err?.message || 'Download paused or interrupted.');
    }
  };

  const handlePauseDownload = async (modelId: string) => {
    await downloader.pauseDownload(modelId);
    const states = await storage.getModelStates();
    setModelStates(states);
  };

  const handleResumeDownload = async (model: AIModelMetadata) => {
    handleDownloadModel(model);
  };

  const handleDeleteModel = async (model: AIModelMetadata) => {
    Alert.alert(
      'Delete Model',
      `Are you sure you want to delete ${model.name} (${model.fileSizeMB} MB) from device storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (selectedModelId === model.id) {
              await selector.unloadActiveModel();
              setSelectedModelId(null);
            }
            await downloader.deleteModel(model.id, model.fileName);
            const states = await storage.getModelStates();
            setModelStates(states);
          },
        },
      ]
    );
  };

  const handleSelectModel = async (modelId: string) => {
    try {
      await selector.selectModel(modelId);
      setSelectedModelId(modelId);
      const model = getModelById(modelId);
      Alert.alert('Model Activated', `${model?.name} loaded into device memory.`);
    } catch (err: any) {
      Alert.alert('Activation Error', err?.message || 'Failed loading model into memory.');
    }
  };

  const handlePreferenceChange = async (pref: RecommendationPreference) => {
    setPreference(pref);
    await storage.setUserPreference(pref);
  };

  const handleToggleDarkMode = async (val: boolean) => {
    setDarkMode(val);
    await storage.setDarkMode(val);
  };

  const handleClearAllData = async () => {
    await storage.clearBenchmarkResults();
    await storage.clearChatHistory();
    setBenchmarks([]);
    Alert.alert('Storage Cleared', 'Chat logs and benchmark history reset.');
  };

  const selectedModel = (selectedModelId ? getModelById(selectedModelId) : null) || INITIAL_AI_MODELS[0];
  const latestBenchmark = benchmarks.length > 0 ? benchmarks[0] : null;

  const renderLoading = () => (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textMuted }]}>
        Loading SaaS AI Brain...
      </Text>
    </View>
  );

  // Render navigation screen
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'Splash':
        return (
          <SplashScreen
            colors={colors}
            onFinish={() => setCurrentScreen('Welcome')}
          />
        );

      case 'Welcome':
        return (
          <WelcomeScreen
            colors={colors}
            onGetStarted={() => setCurrentScreen('DeviceDetection')}
          />
        );

      case 'DeviceDetection':
        return (
          <DeviceDetectionScreen
            colors={colors}
            onDetectionComplete={(hw) => {
              setHardware(hw);
              setCurrentScreen('DeviceDashboard');
            }}
          />
        );

      case 'DeviceDashboard':
        return hardware ? (
          <DeviceDashboard
            hardware={hardware}
            colors={colors}
            onRefresh={refreshHardware}
            onNavigateToRecommendations={() => setCurrentScreen('ModelRegistry')}
          />
        ) : (
          renderLoading()
        );

      case 'BrainDashboard':
        return hardware ? (
          <BrainDashboard
            hardware={hardware}
            selectedModel={selectedModel}
            runtimeState={selectedModelId ? modelStates[selectedModelId] : undefined}
            latestBenchmark={latestBenchmark}
            colors={colors}
            onNavigate={(screen) => setCurrentScreen(screen as ScreenId)}
          />
        ) : (
          renderLoading()
        );

      case 'ModelRegistry':
        return hardware ? (
          <ModelRegistryScreen
            hardware={hardware}
            modelStates={modelStates}
            selectedModelId={selectedModelId}
            preference={preference}
            colors={colors}
            onPreferenceChange={handlePreferenceChange}
            onDownloadModel={handleDownloadModel}
            onSelectModel={handleSelectModel}
            onDeleteModel={handleDeleteModel}
          />
        ) : (
          renderLoading()
        );

      case 'ModelDownload':
        return (
          <ModelDownloadScreen
            modelStates={modelStates}
            selectedModelId={selectedModelId}
            colors={colors}
            onPause={handlePauseDownload}
            onResume={handleResumeDownload}
            onDelete={handleDeleteModel}
            onSelect={handleSelectModel}
          />
        );

      case 'ModelSelection':
        return (
          <ModelSelectionScreen
            selectedModelId={selectedModelId}
            modelStates={modelStates}
            colors={colors}
            onSelectModel={handleSelectModel}
            onNavigateToRegistry={() => setCurrentScreen('ModelRegistry')}
          />
        );

      case 'AIChat':
        return (
          <AIChatScreen
            selectedModel={selectedModel}
            colors={colors}
            onOpenModelSelector={() => setCurrentScreen('ModelSelection')}
            onOpenModelDownload={(model) => handleDownloadModel(model)}
          />
        );

      case 'Benchmark':
        return (
          <BenchmarkScreen
            modelStates={modelStates}
            selectedModelId={selectedModelId}
            benchmarkHistory={benchmarks}
            colors={colors}
            onBenchmarkComplete={(result) => {
              setBenchmarks((prev) => [result, ...prev]);
            }}
            onNavigateToComparison={() => setCurrentScreen('PerformanceComparison')}
          />
        );

      case 'PerformanceComparison':
        return (
          <PerformanceComparisonScreen
            benchmarks={benchmarks}
            colors={colors}
            onNavigateToBenchmark={() => setCurrentScreen('Benchmark')}
          />
        );

      case 'Settings':
        return (
          <SettingsScreen
            darkMode={darkMode}
            colors={colors}
            onToggleDarkMode={handleToggleDarkMode}
            onRescanHardware={refreshHardware}
            onClearAllData={handleClearAllData}
            onNavigateToApiKeys={() => setCurrentScreen('ApiKeys')}
            onNavigateToApiDocs={() => setCurrentScreen('ApiDocs')}
          />
        );

      case 'ApiKeys':
        return (
          <ApiKeysScreen
            colors={colors}
            onOpenDocs={() => setCurrentScreen('ApiDocs')}
          />
        );

      case 'ApiDocs':
        return (
          <ApiDocsScreen
            colors={colors}
            onBack={() => setCurrentScreen('ApiKeys')}
          />
        );

      default:
        return null;
    }
  };

  const showBottomNav =
    currentScreen !== 'Splash' &&
    currentScreen !== 'Welcome' &&
    currentScreen !== 'DeviceDetection';

  return (
    <ErrorBoundary fallbackColors={colors}>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={darkMode ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />

        <View style={styles.screenWrapper}>{renderCurrentScreen()}</View>

        {/* Global SaaS Bottom Tab Bar */}
        {showBottomNav && (
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderTopColor: colors.divider }]}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('BrainDashboard')}
          >
            <Brain
              size={20}
              color={currentScreen === 'BrainDashboard' ? colors.primary : colors.textSubtle}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color:
                    currentScreen === 'BrainDashboard' ? colors.primary : colors.textSubtle,
                },
              ]}
            >
              Brain
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('AIChat')}
          >
            <MessageSquare
              size={20}
              color={currentScreen === 'AIChat' ? colors.primary : colors.textSubtle}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: currentScreen === 'AIChat' ? colors.primary : colors.textSubtle,
                },
              ]}
            >
              Chat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('ModelRegistry')}
          >
            <Layers
              size={20}
              color={currentScreen === 'ModelRegistry' ? colors.primary : colors.textSubtle}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color:
                    currentScreen === 'ModelRegistry' ? colors.primary : colors.textSubtle,
                },
              ]}
            >
              Models
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('Benchmark')}
          >
            <Activity
              size={20}
              color={currentScreen === 'Benchmark' ? colors.primary : colors.textSubtle}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: currentScreen === 'Benchmark' ? colors.primary : colors.textSubtle,
                },
              ]}
            >
              Testing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('ApiKeys')}
          >
            <Key
              size={20}
              color={currentScreen === 'ApiKeys' || currentScreen === 'ApiDocs' ? colors.primary : colors.textSubtle}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: currentScreen === 'ApiKeys' || currentScreen === 'ApiDocs' ? colors.primary : colors.textSubtle,
                },
              ]}
            >
              API Keys
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentScreen('Settings')}
          >
            <Settings
              size={20}
              color={currentScreen === 'Settings' ? colors.primary : colors.textSubtle}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: currentScreen === 'Settings' ? colors.primary : colors.textSubtle,
                },
              ]}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screenWrapper: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});

