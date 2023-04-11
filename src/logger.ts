// This is meant to be replaced with a preferred logging implementation.
export class Logger {
  static info(message: string) {
    console.info(new Date().toLocaleString(), '|', message);
  }
  static error(message: string) {
    console.error(new Date().toLocaleString(), '|', message);
  }
}
