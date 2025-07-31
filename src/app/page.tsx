import { VideoPlayerApp } from "~/components/video-player-app";

export default function HomePage() {
	return (
		<main className="min-h-screen bg-background">
			<div className="container mx-auto py-8">
				<VideoPlayerApp />
			</div>
		</main>
	);
}
