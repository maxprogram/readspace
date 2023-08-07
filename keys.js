const keytar = require('keytar');

const NAMESPACE = 'Readspace';


exports.load = async () => {
    const keys = await keytar.findCredentials(NAMESPACE);
    const settings = {
        OPENAI_API_KEY: '',
        READWISE_TOKEN: ''
    };
    for (const key of keys) {
        settings[key.account] = key.password;
    }
    for (const [key, value] of Object.entries(settings)) {
        if (value && value != '') process.env[key] = value;
    }
    return settings;
};


exports.save = async (settings) => {
    for (const [key, value] of Object.entries(settings)) {
        await keytar.setPassword(NAMESPACE, key, value);
    }
    return settings;
}
