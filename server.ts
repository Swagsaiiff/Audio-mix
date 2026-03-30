import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import ytdl from "@distube/ytdl-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // YouTube Audio Extraction
  app.get("/api/youtube", async (req, res) => {
    const videoUrl = req.query.url as string;
    if (!videoUrl) {
      return res.status(400).send("YouTube URL is required");
    }

    if (!ytdl.validateURL(videoUrl)) {
      return res.status(400).send("Invalid YouTube URL");
    }

    try {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      ];
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

      const requestOptions = {
        headers: {
          'User-Agent': randomUserAgent,
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.youtube.com/',
          'Origin': 'https://www.youtube.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
        }
      };

      const info = await ytdl.getInfo(videoUrl, { requestOptions });
      
      const format = ytdl.chooseFormat(info.formats, { 
        quality: 'highestaudio', 
        filter: 'audioonly' 
      });

      if (!format) {
        return res.status(404).send("No audio format found for this video");
      }

      // Set headers for audio streaming
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", `attachment; filename="youtube_audio.mp3"`);

      // Stream the audio directly to the client
      ytdl(videoUrl, { 
        format,
        requestOptions
      }).pipe(res);
    } catch (error: any) {
      console.error("YouTube extraction error:", error);
      
      if (error.statusCode === 429 || (error.message && error.message.includes('429'))) {
        return res.status(429).send("YouTube is currently rate-limiting this server's IP address. This happens when too many users try to extract audio at once. Please try again in a few minutes or use a direct audio URL/local file.");
      }
      
      res.status(500).send(`Failed to extract audio from YouTube: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });

  // API Proxy for CORS-free audio loading
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("URL parameter is required");
    }

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        return res.status(response.status).send(`Remote server returned ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      
      // Basic check to see if it's likely an audio file or at least not HTML
      if (contentType && contentType.includes("text/html")) {
        return res.status(400).send("The provided URL points to a webpage, not a direct audio file.");
      }

      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return res.status(400).send("The remote file is empty.");
      }
      
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send(`Proxy error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
