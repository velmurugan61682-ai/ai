import { DeviceDetector } from '../brain/DeviceDetector';
import { DeviceHardwareInfo } from '../models/modelTypes';

export class DeviceService {
  private static instance: DeviceService;
  private detector: DeviceDetector;

  private constructor() {
    this.detector = DeviceDetector.getInstance();
  }

  public static getInstance(): DeviceService {
    if (!DeviceService.instance) {
      DeviceService.instance = new DeviceService();
    }
    return DeviceService.instance;
  }

  public async getHardwareInfo(forceRefresh = false): Promise<DeviceHardwareInfo> {
    return this.detector.detectHardware(forceRefresh);
  }

  public formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  public getRamHealthStatus(physicalRamGB: number, availableRamGB: number): {
    label: string;
    color: string;
    ratio: number;
  } {
    const ratio = Math.min(100, Math.round((availableRamGB / physicalRamGB) * 100));
    if (availableRamGB >= 2.5) {
      return { label: 'Optimal for Large Models', color: '#10B981', ratio };
    } else if (availableRamGB >= 1.5) {
      return { label: 'Good for Medium Models', color: '#3B82F6', ratio };
    } else if (availableRamGB >= 0.8) {
      return { label: 'Suitable for Ultra-Lightweight Models', color: '#F59E0B', ratio };
    } else {
      return { label: 'Constrained Memory', color: '#EF4444', ratio };
    }
  }
}

