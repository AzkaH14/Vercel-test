import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  const logs: string[] = [];

  const runCommand = async (cmd: string) => {
    logs.push(`$ ${cmd}`);
    try {
      const { stdout, stderr } = await execAsync(cmd);
      if (stdout) logs.push(stdout.trim());
      if (stderr) logs.push(stderr.trim());
    } catch (err: any) {
      if (err.stdout) logs.push(err.stdout.trim());
      if (err.stderr) logs.push(err.stderr.trim());
      logs.push(`Exit code: ${err.code}`);
      throw new Error(`Command failed: ${cmd}`);
    }
  };

  try {
    // 1. Initialize repository
    try {
      await runCommand('git init');
    } catch (e) {
      // Ignore if already initialized
    }

    // 2. Stage files
    await runCommand('git add .');

    // 3. Commit files
    try {
      await runCommand('git commit -m "Initialize Next.js To-Do app with Google Sheets database"');
    } catch (e) {
      // Ignore if nothing to commit
    }

    // 4. Force branch to main
    await runCommand('git branch -M main');

    // 5. Setup remote
    try {
      await runCommand('git remote remove origin');
    } catch (e) {
      // Ignore if no remote existed
    }
    await runCommand('git remote add origin https://github.com/AzkaH14/Vercel-test.git');

    // 6. Push to GitHub
    await runCommand('git push -u origin main');

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Git automation execution failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Git automation failed',
        logs,
      },
      { status: 500 }
    );
  }
}
