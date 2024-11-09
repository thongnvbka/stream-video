import ffmpeg from "fluent-ffmpeg";

const ffmpegPath = require("ffmpeg-static");
ffmpeg.setFfmpegPath(ffmpegPath);

export function changeVideoResolution(
  inputPath: string,
  outputPath: string,
  width: number,
  height: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([`-vf scale=${width}:${height}`])
      .format("mp4")
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
