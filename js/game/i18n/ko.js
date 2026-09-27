// 한국어 언어팩 (기준 언어). 다른 언어팩은 이 키들을 그대로 옮겨 번역한다.
import ui from './ko/ui.js';
import shell from './ko/shell.js';
import engine from './ko/engine.js';
import data from './ko/data.js';
import interp from './ko/interp.js';
import story from './ko/story.js';

export default { ...ui, ...shell, ...engine, ...data, ...interp, ...story };
