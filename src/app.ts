import express, { Request, Response } from "express";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { Readable, PassThrough } from "stream";

const app = express();
const PORT = 3000;

const storage = multer.memoryStorage();
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true); // Chấp nhận tệp videos
    } else {
      cb(null, false); // Từ chối các tệp không phải video
    }
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.post(
  "/upload",
  upload.single("video"),
  async (req: Request, res: Response): Promise<any> => {
    const { resolution } = req.query;
    if (!(req as any).file) {
      return res.status(400).send("Tệp không hợp lệ.");
    }
    fs.writeFileSync("test_input.mp4", req.file.buffer);
    console.log("Tệp đầu vào đã được ghi để kiểm tra.");

    // Kiểm tra độ phân giải hợp lệ (ví dụ: '1280:720', '1920:1080', ...)
    if (!resolution || !/^\d+:\d+$/.test(resolution as string)) {
      return res
        .status(400)
        .send(
          'Độ phân giải không hợp lệ. Vui lòng sử dụng định dạng "width:height" (ví dụ: "1280:720").'
        );
    }

    const outputFilePath = path.join(__dirname, `processed_${Date.now()}.mp4`);

    const inputStream = new Readable();
    inputStream._read = () => {};
    inputStream.push((req as any).file.buffer);
    inputStream.push(null);

    ffmpeg.setFfmpegPath(ffmpegStatic as string);
    ffmpeg(inputStream)
      .outputOptions("-vf scale=1280:720")
      .output(outputFilePath)
      // .on("end", () => {
      //   console.log("Xử lý video đã hoàn tất.");
      //   res.download(outputFilePath, () => {
      //     fs.unlinkSync(outputFilePath);
      //     console.log("Tệp đã được xóa.");
      //   });
      // })
      // .on("error", (err) => {
      //   console.error(err);
      //   res.status(500).send("Đã xảy ra lỗi khi xử lý video.");
      // });
      .on("start", (commandLine) => {
        console.log("Lệnh ffmpeg:", commandLine);
      })
      .on("stderr", (stderrLine) => {
        console.log("ffmpeg stderr:", stderrLine);
      })
      .on("end", () => {
        res.status(200).send({
          message: "Video đã xử lý thành công!",
          filePath: outputFilePath,
          resolution: resolution,
        });
      })
      .on("error", (err: Error) => {
        console.error("Lỗi xử lý video:", err);
        res.status(500).send("Lỗi khi xử lý video.");
      })
      .run();
  }
);

app.listen(PORT, () => {
  console.log(`Server đang chạy trên http://localhost:${PORT}`);
});
