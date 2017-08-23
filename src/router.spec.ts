import {expect} from 'chai';
import {Router} from './router';

describe('Router', function () {
    let router;

    beforeEach(function () {
        router = new Router({
            routes: {
                '/': 'home',
                '/test/:id/:name/page': 'test',
                '/cond/:name(/:cond)': 'cond',
                '/home/alias': 'homeAlias',
                '/anotherHome/alias': 'anotherHomeAlias',
                '/*path': 'page404'
            },
            aliases: {
                homeAlias: 'home',
                anotherHomeAlias: 'home'
            }
        });
    });

    it('should go between pages', function () {
        return router.match('/').then((event) => {
            expect(event).to.eql({
                id: event.id,
                url: '/',
                name: 'home',
                params: {},
                query: {},
                hash: '',
                state: undefined,
                stopPropagation: event.stopPropagation
            });
        });
    });

    it('should be able to add middlewares', function () {
        let called = false;

        router.use(() => {
            called = true;
        });

        return router.match('/').then(() => {
            expect(called).to.equal(true);
        });
    });

    it('support be able to pass event through middlewares', function () {
        router.use((event) => event.test1 = true);
        router.use((event) => event.test2 = true);

        return router.match('/?str=test#abc').then(event => {
            expect(event.test1).to.equal(true);
            expect(event.test2).to.equal(true);
        });
    });

    it('should pass route event object', function () {
        let evt = null;

        router.use((event) => {
            evt = event;
        });

        return router.match('/').then(() => {
            expect(evt).to.be.an('object');
        });
    });

    it('should pass same route event to middlewares in chain', function () {
        let evt1 = null,
            evt2 = null;

        router.use((event) => {
            evt1 = event;
        });

        router.use((event) => {
            evt2 = event;
        });

        return router.match('/').then(() => {
            expect(evt1 === evt2).to.equal(true);
        });
    });

    it('should pass correct params', function () {
        return router.match('/test/1/2/page').then((event) => {
            expect(event).to.eql({
                id: event.id,
                url: '/test/1/2/page',
                name: 'test',
                params: {
                    id: 1,
                    name: 2
                },
                query: {},
                hash: '',
                state: undefined,
                stopPropagation: event.stopPropagation
            });
        });
    });

    it('should match page 404', function () {
        return router.match('/test/page/not/found').then((event) => {
            expect(event).to.eql({
                id: event.id,
                url: '/test/page/not/found',
                name: 'page404',
                params: {},
                query: {},
                hash: '',
                state: undefined,
                stopPropagation: event.stopPropagation
            });
        });
    });

    it('should pass correct query params', function () {
        return router.match('/?id=1&name=2').then((event) => {
            expect(event).to.eql({
                id: event.id,
                url: '/',
                name: 'home',
                params: {},
                query: {
                    id: 1,
                    name: 2
                },
                hash: '',
                state: undefined,
                stopPropagation: event.stopPropagation
            });
        });
    });

    it('should pass correct params with hash', function () {
        return router.match('/#abc').then((event) => {
            expect(event).to.eql({
                id: event.id,
                url: '/',
                name: 'home',
                params: {},
                query: {},
                hash: 'abc',
                state: undefined,
                stopPropagation: event.stopPropagation
            });
        });
    });

    it('should pass correct params with conditional', function () {
        return router.match('/cond/1/2').then((event) => {
            expect(event).to.eql({
                id: event.id,
                url: '/cond/1/2',
                name: 'cond',
                params: {
                    name: 1,
                    cond: 2
                },
                query: {},
                hash: '',
                state: undefined,
                stopPropagation: event.stopPropagation
            });
        });
    });

    it('should be able to notify error chain on rejection', function () {
        let errorSame = false,
            errorSecond = false;

        router.use(() => {
            return Promise.reject('error on home registration');
        }, (error) => {
            errorSame = true;

            throw error;
        });

        router.use(null, () => {
            errorSecond = true;
        });

        return router.match('/').then(() => {
            expect(errorSame).to.equal(true);
            expect(errorSecond).to.equal(true);
        });
    });

    it('should reverse with params and condition', function () {
        let url = router.reverse('cond', {
            name: 'test',
            cond: 'abc',
            q: 'cde'
        });

        expect(url).to.equal('/cond/test/abc?q=cde');
    });

    it('should reverse with params and without condition', function () {
        let url = router.reverse('cond', {
            name: 'test',
            q: 'cde'
        });

        expect(url).to.equal('/cond/test?q=cde');
    });

    it('should reverse with empty params and without condition', function () {
        let url = router.reverse('cond', {
            name: 'test',
            q: 'cde',
            q1: '',
            q3: undefined,
            q4: null
        });

        expect(url).to.equal('/cond/test?q=cde');
    });

    it('should reverse with params and empty condition', function () {
        let url = router.reverse('cond', {
            name: 'test',
            cond: null,
            q: 'cde'
        });

        expect(url).to.equal('/cond/test?q=cde');
    });

    it('should reverse to empty if some required params is missing', function () {
        let url = router.reverse('cond', {
            cond: null,
            q: 'cde'
        });

        expect(url).to.equal('#');
    });

    it('should reverse page404 route', function () {
        let url = router.reverse('page404', {});

        expect(url).to.equal('/');
    });

    it('should match event', function () {
        let event = {
            id: 'event1',
            url: '/cond/1/2',
            name: 'cond',
            params: {
                name: 1,
                cond: 2
            },
            query: {
                id: 1,
                name: 2
            },
            hash: '123'
        };

        return router.matchEvent(event).then((event) => {
            expect(event).to.eql({
                id: event.id,
                url: '/cond/1/2',
                name: 'cond',
                params: {
                    name: 1,
                    cond: 2
                },
                query: {
                    id: 1,
                    name: 2
                },
                hash: '123',
                state: undefined,
                stopPropagation: event.stopPropagation
            });
        });
    });

    it('should match RouterEvent', function () {
        let {event} = router.getUrlMeta('/cond/1/2');

        return router.matchRouterEvent(event).then((evt) => {
            expect(evt).to.equal(event);
        });
    });

    it('should debounce matches', function () {
        let event1Called = false,
            event2Called = false;

        router.match('/').then(() => event1Called = true);
        router.match('/cond/1/2').then(() => event2Called = true);

        return router.match('/cond/2/3').then(() => {
            expect(event1Called).to.equal(true);
            expect(event2Called).to.equal(false);
        });
    });

    it('should be able to stop chain', function () {
        let neverCalled = true;

        router.use((event) => {
            event.stopPropagation();
        });

        router.use(() => {
            neverCalled = false;
        });

        return router.match('/').then(() => {
            expect(neverCalled).to.equal(true);
        });
    });

    it('should support aliases', function () {
        let queue = [];

        router.use((event) => {
            queue.push(event.name);
        });

        return router.match('/')
            .then(() => router.match('/home/alias'))
            .then(() => router.match('/anotherHome/alias'))
            .then(() => {
                expect(queue).to.eql(['home', 'home', 'home']);
            });
    });

    it('should store original name reference for aliases', function () {
        let queue = [];

        router.use((event) => {
            if (event.isAlias) {
                queue.push(event.origName);
            }
        });

        return router.match('/')
            .then(() => router.match('/home/alias'))
            .then(() => router.match('/anotherHome/alias'))
            .then(() => {
                expect(queue).to.eql(['homeAlias', 'anotherHomeAlias']);
            });
    });
});
