"use client";

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '~/lib/utils';

interface VideoBacklightProps {
  videoElement?: HTMLVideoElement | null;
  className?: string;
  intensity?: number; // 0-1
  enabled?: boolean;
}

export function VideoBacklight({ 
  videoElement, 
  className, 
  intensity = 0.3,
  enabled = true 
}: VideoBacklightProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dominantColor, setDominantColor] = useState<string>('rgb(59, 130, 246)'); // Default blue
  
  useEffect(() => {
    if (!enabled || !videoElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    
    const extractDominantColor = () => {
      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) return;
      
      try {
        // Set canvas size to a small sample for performance
        canvas.width = 32;
        canvas.height = 18;
        
        // Draw current video frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Calculate average color
        let r = 0, g = 0, b = 0;
        const pixelCount = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
          r += data[i] || 0;
          g += data[i + 1] || 0;
          b += data[i + 2] || 0;
        }
        
        r = Math.floor(r / pixelCount);
        g = Math.floor(g / pixelCount);
        b = Math.floor(b / pixelCount);
        
        // Apply intensity and create a more subtle color
        const adjustedR = Math.floor(r * intensity);
        const adjustedG = Math.floor(g * intensity);
        const adjustedB = Math.floor(b * intensity);
        
        setDominantColor(`rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`);
      } catch (error) {
        // Silently handle CORS or other canvas errors
        console.debug('Could not extract video colors:', error);
      }
      
      animationFrame = requestAnimationFrame(extractDominantColor);
    };
    
    // Start color extraction when video is playing
    const handlePlay = () => {
      extractDominantColor();
    };
    
    const handlePause = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
    
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handlePause);
    
    // Start immediately if video is already playing
    if (!videoElement.paused) {
      handlePlay();
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('ended', handlePause);
    };
  }, [videoElement, enabled, intensity]);

  if (!enabled) return null;

  return (
    <>
      {/* Hidden canvas for color extraction */}
      <canvas
        ref={canvasRef}
        className="hidden"
        width={32}
        height={18}
      />
      
      {/* Ambient backlight layers */}
      <div className={cn("absolute inset-0 -z-20", className)}>
        {/* Base gradient */}
        <div 
          className="absolute inset-0 rounded-lg blur-3xl scale-110 opacity-40 transition-colors duration-1000"
          style={{
            background: `radial-gradient(ellipse at center, ${dominantColor}, transparent 70%)`
          }}
        />
        
        {/* Secondary glow */}
        <div 
          className="absolute inset-0 rounded-lg blur-2xl scale-105 opacity-20 transition-colors duration-1000"
          style={{
            background: `linear-gradient(45deg, ${dominantColor}, transparent 50%)`
          }}
        />
        
        {/* Subtle base tint */}
        <div className="absolute inset-0 bg-muted/10 rounded-lg" />
      </div>
    </>
  );
}