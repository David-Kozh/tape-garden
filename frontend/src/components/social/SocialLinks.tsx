import React from "react";
import { Globe } from "lucide-react";

export type PlatformKey =
  | "SoundCloud"
  | "Spotify"
  | "Instagram"
  | "YouTube"
  | "Twitter"
  | "Bandcamp"
  | "Apple Music"
  | "TikTok"
  | "Other";

export function detectPlatformFromUrl(url: string): PlatformKey {
  if (!url) return "Other";
  const lower = url.toLowerCase();
  if (lower.includes("soundcloud.com")) return "SoundCloud";
  if (lower.includes("spotify.com")) return "Spotify";
  if (lower.includes("instagram.com")) return "Instagram";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YouTube";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "Twitter";
  if (lower.includes("bandcamp.com")) return "Bandcamp";
  if (lower.includes("music.apple.com") || lower.includes("apple.com/music")) return "Apple Music";
  if (lower.includes("tiktok.com")) return "TikTok";
  return "Other";
}

export function parseSocialLinks(links: unknown): Array<{ platform: string; url: string }> {
  if (!Array.isArray(links)) return [];
  return links
    .map((item) => {
      if (!item) return null;
      if (typeof item === "object" && item !== null && "url" in item) {
        const obj = item as { platform?: string; url?: string };
        if (!obj.url || typeof obj.url !== "string" || !obj.url.trim()) return null;
        const trimmedUrl = obj.url.trim();
        const platform =
          obj.platform && obj.platform !== "Other"
            ? obj.platform
            : detectPlatformFromUrl(trimmedUrl);
        return {
          platform,
          url: trimmedUrl,
        };
      }
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) return null;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === "object" && parsed.url) {
            const parsedUrl = String(parsed.url).trim();
            const platform =
              parsed.platform && parsed.platform !== "Other"
                ? parsed.platform
                : detectPlatformFromUrl(parsedUrl);
            return {
              platform,
              url: parsedUrl,
            };
          }
        } catch {
          // Plain URL string
        }
        return {
          platform: detectPlatformFromUrl(trimmed),
          url: trimmed,
        };
      }
      return null;
    })
    .filter((l): l is { platform: string; url: string } => l !== null);
}

export function SocialIcon({
  platform,
  className = "w-4 h-4",
}: {
  platform: string;
  className?: string;
}) {
  const normalized = platform.toLowerCase();

  if (normalized.includes("soundcloud")) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M1.175 12.225a.1.1 0 0 0-.1.1l-.278 2.05.278 2a.1.1 0 0 0 .1.1c.053 0 .096-.041.101-.093l.298-2.007-.298-2.05a.1.1 0 0 0-.101-.1zm1.144-.805a.127.127 0 0 0-.127.12l-.252 2.802.252 2.709a.127.127 0 0 0 .127.12.127.127 0 0 0 .126-.12l.273-2.709-.273-2.802a.127.127 0 0 0-.126-.12zm1.149-.579a.146.146 0 0 0-.146.142l-.208 3.398.208 3.195a.146.146 0 0 0 .146.143.146.146 0 0 0 .146-.143l.233-3.195-.233-3.398a.146.146 0 0 0-.146-.142zm1.149.034a.167.167 0 0 0-.167.162l-.168 3.355.168 3.185a.167.167 0 0 0 .167.162.167.167 0 0 0 .167-.162l.192-3.185-.192-3.355a.167.167 0 0 0-.167-.162zm1.148-.485a.187.187 0 0 0-.187.184l-.128 3.84.128 3.238a.187.187 0 0 0 .187.184.187.187 0 0 0 .188-.184l.15-3.238-.15-3.84a.187.187 0 0 0-.188-.184zm1.149-.537a.207.207 0 0 0-.207.204l-.089 4.377.089 3.252a.207.207 0 0 0 .207.204.207.207 0 0 0 .207-.204l.11-3.252-.11-4.377a.207.207 0 0 0-.207-.204zm1.148-.403a.227.227 0 0 0-.227.225l-.048 4.78.048 3.25a.227.227 0 0 0 .227.225.227.227 0 0 0 .227-.225l.07-3.25-.07-4.78a.227.227 0 0 0-.227-.225zm1.148-.377a.247.247 0 0 0-.247.245l-.009 5.157.009 3.242a.247.247 0 0 0 .247.245.247.247 0 0 0 .247-.245l.03-3.242-.03-5.157a.247.247 0 0 0-.247-.245zm1.149.034a.266.266 0 0 0-.266.265v8.349a.266.266 0 0 0 .266.266.266.266 0 0 0 .266-.266V9.317a.266.266 0 0 0-.266-.265zm2.146-2.525c-.104 0-.204.019-.3.048a.14.14 0 0 0-.117.138l-.13 3.662.001 7.279a.27.27 0 0 0 .271.264h9.117c2.33 0 4.225-1.895 4.225-4.225 0-2.228-1.733-4.058-3.923-4.212-.416-2.909-2.91-5.143-5.918-5.143-2.039 0-3.839 1.03-4.898 2.6a.4.4 0 0 0-.328.089z" />
      </svg>
    );
  }

  if (normalized.includes("spotify")) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M12 0C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12s12-5.372 12-12c0-6.627-5.373-12-12-12zm5.494 17.306a.75.75 0 0 1-1.03.248c-2.82-1.723-6.37-2.113-10.55-1.157a.749.749 0 1 1-.335-1.46c4.57-1.042 8.52.476 11.667 2.4a.75.75 0 0 1 .248 1.031zm1.467-3.262a.937.937 0 0 1-1.29.309c-3.227-1.983-8.146-2.557-11.963-1.398a.937.937 0 0 1-.546-1.794c4.364-1.324 9.791-.687 13.49 1.593a.937.937 0 0 1 .309 1.29zm.126-3.414C15.228 8.358 8.847 8.147 5.15 9.27a1.124 1.124 0 1 1-.655-2.152c4.242-1.288 11.296-1.043 15.65 1.543a1.124 1.124 0 1 1-1.058 1.969z" />
      </svg>
    );
  }

  if (normalized.includes("instagram")) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    );
  }

  if (normalized.includes("youtube")) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }

  if (normalized.includes("twitter") || normalized === "x") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  if (normalized.includes("bandcamp")) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M0 18.75l7.437-13.5h16.563l-7.438 13.5z" />
      </svg>
    );
  }

  if (normalized.includes("apple")) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm4.27 7.027l-5.22 1.34a.6.6 0 0 0-.45.58v4.95a1.8 1.8 0 1 1-1.2-1.7v-5.74a.6.6 0 0 1 .45-.58l5.4-1.39a.6.6 0 0 1 .74.58v1.96z" />
      </svg>
    );
  }

  if (normalized.includes("tiktok")) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    );
  }

  return <Globe className={className} aria-hidden="true" />;
}

export function getPlatformGlowClasses(platform: string): string {
  const normalized = platform.toLowerCase();
  if (normalized.includes("soundcloud")) {
    return "hover:border-[#ff5500]/70 hover:text-[#ff5500] hover:shadow-[0_0_14px_rgba(255,85,0,0.45)]";
  }
  if (normalized.includes("spotify")) {
    return "hover:border-[#1ED760]/70 hover:text-[#1ED760] hover:shadow-[0_0_14px_rgba(30,215,96,0.45)]";
  }
  if (normalized.includes("instagram")) {
    return "hover:border-[#E1306C]/70 hover:text-[#E1306C] hover:shadow-[0_0_14px_rgba(225,48,108,0.45)]";
  }
  if (normalized.includes("youtube")) {
    return "hover:border-[#FF0000]/70 hover:text-[#FF0000] hover:shadow-[0_0_14px_rgba(255,0,0,0.45)]";
  }
  if (normalized.includes("twitter") || normalized === "x") {
    return "hover:border-white/70 hover:text-white hover:shadow-[0_0_14px_rgba(255,255,255,0.4)]";
  }
  if (normalized.includes("bandcamp")) {
    return "hover:border-[#1DA0C3]/70 hover:text-[#1DA0C3] hover:shadow-[0_0_14px_rgba(29,160,195,0.45)]";
  }
  if (normalized.includes("apple")) {
    return "hover:border-[#FC3C44]/70 hover:text-[#FC3C44] hover:shadow-[0_0_14px_rgba(252,60,68,0.45)]";
  }
  if (normalized.includes("tiktok")) {
    return "hover:border-[#25F4EE]/70 hover:text-[#25F4EE] hover:shadow-[0_0_14px_rgba(37,244,238,0.45)]";
  }
  return "hover:border-emerald-400/70 hover:text-emerald-400 hover:shadow-[0_0_14px_rgba(52,211,153,0.35)]";
}

export function formatPlatformLabel(platform: string, url: string): string {
  if (platform && platform !== "Other") {
    if (platform.toLowerCase() === "twitter") return "X / Twitter";
    return platform;
  }
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || "Website";
  } catch {
    return "Website";
  }
}

export function SocialLinkButton({
  platform,
  url,
  className = "",
}: {
  platform: string;
  url: string;
  className?: string;
}) {
  const detectedPlatform =
    platform && platform !== "Other" ? platform : detectPlatformFromUrl(url);
  const glowClasses = getPlatformGlowClasses(detectedPlatform);
  const label = formatPlatformLabel(detectedPlatform, url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className={`group inline-flex items-center justify-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold bg-zinc-900/60 hover:bg-zinc-900/80 text-zinc-200 border border-white/15 backdrop-blur-md shadow-xs transition-all duration-300 ${glowClasses} ${className}`}
    >
      <SocialIcon
        platform={detectedPlatform}
        className="w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover:scale-110"
      />
      <span className="hidden sm:inline truncate max-w-[140px] md:max-w-none">
        {label}
      </span>
    </a>
  );
}
