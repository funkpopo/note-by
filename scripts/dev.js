const { spawn } = require('child_process');
const { platform } = require('os');

// 检测操作系统
const isWin = platform() === 'win32';

// 存储子进程
let nextProcess;
let electronProcess;
let exiting = false;

// 启动Next.js进程
function startNext() {
  console.log('启动 Next.js 开发服务器...');
  const cmd = isWin ? 'npm.cmd' : 'npm';
  nextProcess = spawn(cmd, ['run', 'dev'], { 
    stdio: 'inherit',
    shell: true 
  });

  nextProcess.on('close', (code) => {
    if (!exiting) {
      console.log(`Next.js 进程已退出，退出码: ${code}`);
      cleanupAndExit();
    }
  });

  return new Promise((resolve) => {
    // 等待一段时间以确保Next.js启动
    setTimeout(resolve, 3000);
  });
}

// 启动Electron进程
function startElectron() {
  console.log('启动 Electron 应用...');
  const cmd = isWin ? 'electron.cmd' : 'electron';
  electronProcess = spawn(cmd, ['.'], { 
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ELECTRON_DEV: 'true' }
  });

  electronProcess.on('close', (code) => {
    if (!exiting) {
      console.log(`Electron 进程已退出，退出码: ${code}`);
      cleanupAndExit();
    }
  });
}

// 清理所有进程并退出
function cleanupAndExit() {
  exiting = true;
  console.log('正在清理和退出...');

  const killProcess = (proc, name) => {
    if (proc && !proc.killed) {
      console.log(`终止 ${name} 进程...`);
      try {
        if (isWin) {
          spawn('taskkill', ['/pid', proc.pid, '/f', '/t'], { stdio: 'ignore' });
        } else {
          proc.kill('SIGKILL');
        }
      } catch (err) {
        console.error(`终止 ${name} 进程时出错:`, err);
      }
    }
  };

  // 终止Electron进程
  killProcess(electronProcess, 'Electron');
  
  // 终止Next.js进程
  killProcess(nextProcess, 'Next.js');

  // 确保脚本退出
  setTimeout(() => {
    console.log('所有进程已关闭，正在退出...');
    process.exit(0);
  }, 1000);
}

// 处理进程信号
process.on('SIGINT', cleanupAndExit);
process.on('SIGTERM', cleanupAndExit);
process.on('exit', cleanupAndExit);

// 启动所有进程
async function start() {
  try {
    await startNext();
    startElectron();
  } catch (err) {
    console.error('启动进程时出错:', err);
    cleanupAndExit();
  }
}

start(); 