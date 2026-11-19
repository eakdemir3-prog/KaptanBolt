// Açılış: önce robot modelini (uygulamanın içindeki robot.glb) yükle, sonra oyunu başlat.
// Model yüklenemezse oyun yedek robotla yine açılır.
import { loadRobotModel } from './game/robotModel.js';
loadRobotModel().finally(() => import('./main.js'));
