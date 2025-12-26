import { VoiceMonitor } from "@/app/components";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-900">
      <main className="flex min-h-screen w-full max-w-xl flex-col items-center justify-center py-16 px-8">
        <VoiceMonitor />
      </main>
    </div>
  );
}
