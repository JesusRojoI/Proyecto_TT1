const API = {
    async connect(host, port, user, password) {
        const r = await fetch('/api/connection/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port, user, password })
        });
        return r.json();
    },
    async connection() { return (await fetch('/api/connection')).json(); },
    async disconnect() { return (await fetch('/api/connection/disconnect', { method: 'POST' })).json(); },
    async databases() { return (await fetch('/api/databases')).json(); },
    async dictionary(database) { return (await fetch('/api/database/' + encodeURIComponent(database) + '/dictionary')).json(); },
    async tablePreview(database, table) {
        return (await fetch('/api/database/' + encodeURIComponent(database) + '/table/' + encodeURIComponent(table) + '/preview')).json();
    },
    async translate(expression, database) {
        const r = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expression, database })
        });
        return r.json();
    }
};
