import { VideoPlayerApp } from "~/components/video-player-app";
import { ThemeToggle } from "~/components/theme-toggle";

export default function HomePage() {
	return (
		<main className="min-h-screen bg-background transition-colors">
			{/* Header with theme toggle */}
			<div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex h-14 items-center justify-between">
						<div className="flex items-center space-x-2">
							<h1 className="text-lg font-semibold">PlaybackMan</h1>
						</div>
						<ThemeToggle />
					</div>
				</div>
			</div>

			{/* Main content */}
			<div className="container mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
				<VideoPlayerApp />
			</div>
		</main>
	);
}
