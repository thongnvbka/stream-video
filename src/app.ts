import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import cors from "cors";
import fs from "fs";
import Queue from "bull";
import { changeVideoResolution } from "./videoProcessor";
import "../env";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "localhost";

const UPLOAD_DIR = path.join(__dirname, "uploads");
const OUTPUT_DIR = path.join(__dirname, "videos");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(path.join(__dirname, "uploads"));
}
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(path.join(__dirname, "videos"));
}
app.use("/videos", express.static(OUTPUT_DIR));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /mp4|avi|mkv|mov/;
    const extName = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimeType = fileTypes.test(file.mimetype);

    if (extName && mimeType) {
      return cb(null, true);
    } else {
      cb(new Error("Only video files are allowed!"));
    }
  },
});

const videoQueue = new Queue("video processing", {
  redis: { port: 6379, host: "127.0.0.1" }, // Cấu hình kết nối Redis
});

videoQueue.process(async (job) => {
  const {
    inputPath,
    outputPath,
    outputDir,
    videoUrl,
    width,
    height,
    callbackUrl,
  } = job.data;
  try {
    await changeVideoResolution(
      inputPath,
      outputPath,
      outputDir,
      width,
      height
    );

    // Gọi API của người dùng với URL của video khi hoàn thành
    if (callbackUrl) {
      const fullCallbackUrl = `${callbackUrl}?videoUrl=${videoUrl}`;
      await axios.get(fullCallbackUrl);
    }
    return { success: true, videoUrl };
  } catch (error) {
    console.error("Error processing job:", job.id, error);
    throw error;
  }
});

app.post(
  "/upload",
  upload.single("video"),
  async (req: Request, res: Response): Promise<any> => {
    const { width, height, callbackUrl } = req.query;

    if (!(req as any).file) {
      return res.status(400).send("Tệp không hợp lệ.");
    }

    const inputPath = path.join(UPLOAD_DIR, req.file.filename);
    const outputFileName = `${new Date().getTime()}_${width}x${height}.m3u8`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    const videoUrl = `${HOST}:${PORT}/videos/${outputFileName}`;
    try {
      const job = await videoQueue.add({
        inputPath,
        outputPath,
        outputDir: OUTPUT_DIR,
        videoUrl,
        width,
        height,
        callbackUrl,
      });
      // await fs.promises.unlink(inputPath);
      res.json({
        message: "Video được đưa vào hàng đợi để xử lý",
        jobId: job.id,
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Failed to process video" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server đang chạy trên ${HOST}:${PORT}`);
});
