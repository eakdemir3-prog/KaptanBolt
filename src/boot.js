// Açılış: önce robot modelini (uygulamanın içindeki robot.glb) yükle, sonra oyunu başlat.
// Model yüklenemezse oyun yedek robotla yine açılır.
import { loadRobotModel, loadEnemyModels } from './game/robotModel.js';
Promise.all([loadRobotModel(), loadEnemyModels()]).finally(() => import('./main.js'));
