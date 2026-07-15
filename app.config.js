export default ({ config }) => ({
  ...config,

  android: {
    ...config.android,

    package:
      process.env.APP_ENV === "development"
        ? "com.mokeb.mobile.dev"
        : "com.mokeb.mobile",
  },
});
