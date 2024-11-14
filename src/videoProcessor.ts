import ffmpeg from "fluent-ffmpeg";
import path from "path";

const ffmpegPath = require("ffmpeg-static");
ffmpeg.setFfmpegPath(ffmpegPath);

export function changeVideoResolution(
  inputPath: string,
  outputPath: string,
  outputDir: string,
  width: number,
  height: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        `-vf scale=${width}:${height}`,
        "-profile:v baseline", // HLS yêu cầu profile baseline
        "-level 3.0",
        "-start_number 0",
        "-hls_time 10",
        "-hls_list_size 0",
        "-hls_segment_filename",
        path.join(outputDir, `${Date.now()}_segment_%03d.ts`),
        "-f hls",
      ])
      // .format("mp4")
      // .output(outputPath)
      .on("start", (commandLine) => {
        console.log("FFmpeg command:", commandLine);
      })
      .on("error", (err) => {
        console.error("Error occurred:", err);
        reject(err);
      })
      .on("end", () => {
        console.log("Processing finished!");
        resolve();
      })
      .save(outputPath);
  });
}
