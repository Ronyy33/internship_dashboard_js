const routes = require('./route_handlers');

const ctx = {};
const reply = {
    download: (file) => {
        console.log('Successfully generated and downloaded:', file);
        process.exit(0);
    }
};

routes.generateAndDownloadReport(ctx, reply).catch(err => {
    console.error("Error generating CSV:", err);
    process.exit(1);
});
