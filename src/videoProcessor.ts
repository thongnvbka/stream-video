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
      .outputOptions([
        `-vf scale=${width}:${height}`,
        "-profile:v baseline", // HLS yêu cầu profile baseline
        "-level 3.0",
        "-start_number 0",
        "-hls_time 10",
        "-hls_list_size 0",
        "-f hls",
      ])
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
