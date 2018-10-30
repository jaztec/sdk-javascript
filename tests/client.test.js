/*
 * Panflux Javascript SDK
 * (c) Omines Internetbureau B.V. - https://omines.nl/
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

require('dotenv').config();

const {Client} = require('../index.js');

const testConfig = {
    tokenURL: process.env.TOKEN_URL,
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
};

test('Client instantiation', async () => {
    const onNewToken = jest.fn();

    const client = Client.init(testConfig);
    client.on('newToken', onNewToken);

    const token = await client.authenticate();

    expect(client).toBeInstanceOf(Client);
    expect(onNewToken).toBeCalledWith(token);
    expect(client.token).toBe(token);

    return client.query('me { id, name }');
});

test('Bad config', () => {
    expect(() => Client.init()).toThrow('Required property');
    expect(() => Client.init({tokenURL: 'https://example.org/'})).toThrow('Required property');
});

test('Invalid query', async () => {
    const onError = jest.fn();

    const client = Client.init(testConfig);
    client.on('error', onError);

    return client.query('foo bar').catch(error => {
        expect(onError).toBeCalled();
        expect(error.message).toContain('Response not successful');
    });
});

test('Invalid credentials', async () => {
    const client = Client.init(Object.assign({}, testConfig, {clientID: '684'}));

    await expect(client.authenticate()).rejects.toThrow(Error);
});

test('Subscription', async () => {
    let client, subscription;
    return new Promise(resolve => {
        client = Client.init(testConfig);
        client.subscribe('ping', data => {
            expect(data.ping).toBe('pong');
            subscription.unsubscribe();
            expect(subscription.closed).toBe(true);
            resolve();
        }).then(s => {
            subscription = s;
        });
    });
});

test('Token reuse', async () => {
    const client1 = Client.init(testConfig);
    const client2 = Client.init(testConfig, await client1.authenticate());

    const onNewToken = jest.fn();
    client2.on('newToken', onNewToken);

    await client2.query('me { id, name }');

    expect(onNewToken).toHaveBeenCalledTimes(0);
});
