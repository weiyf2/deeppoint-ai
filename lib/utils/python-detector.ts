// Python 命令检测工具
import { execSync } from 'child_process';

/**
 * 检测系统中可用的 Python 命令
 * @returns 可用的 Python 命令（python3、python 或 null）
 */
export function detectPythonCommand(): string {
  // 优先使用环境变量配置
  if (process.env.PYTHON_PATH) {
    return process.env.PYTHON_PATH;
  }

  // 尝试的命令列表（按优先级）
  const pythonCommands = ['python3', 'python'];

  for (const cmd of pythonCommands) {
    try {
      // 尝试执行命令获取版本
      execSync(`${cmd} --version`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 5000,
      });
      return cmd;
    } catch {
      // 该命令不可用，继续尝试下一个
    }
  }

  // 都不可用，抛出错误
  throw new Error(
    '未找到可用的 Python 命令！请确保已安装 Python 3.x\n' +
    '   - Windows: 下载 https://www.python.org/downloads/\n' +
    '   - Linux: sudo apt-get install python3\n' +
    '   - 或设置环境变量: PYTHON_PATH=your_python_path'
  );
}

/**
 * 单例模式缓存检测结果
 */
let cachedPythonCommand: string | null = null;

export function getPythonCommand(): string {
  if (cachedPythonCommand === null) {
    cachedPythonCommand = detectPythonCommand();
  }
  return cachedPythonCommand;
}
