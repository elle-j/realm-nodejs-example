// This is meant to be replaced with a preferred logging implementation.
exports.logger = {
  info(message) {
    console.info(new Date().toLocaleString(), '|', message);
  },
  error(message) {
    console.error(new Date().toLocaleString(), '|', message);
  },
};
