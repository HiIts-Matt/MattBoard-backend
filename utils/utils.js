export const seconds = (secs) => {
    return 1000 * secs;
}

export const minutes = (mins) => {
    return 1000 * 60 * mins;
}

export const hours = (hours) => {
    return 1000 * 60 * 60 * hours;
}

export const days = (days) => {
    return 1000 * 60 * 60 * 24 * days;
}

export function IdHandler() {

    const activeRequests = new Map()

    const receive = (req) => {

        const route = req?.route?.path
        const action = Object.entries(req?.route?.methods || {}).filter(([action, value]) => value)?.[0]?.[0]
        const requestId = crypto.randomUUID();
        const time = new Date();

        activeRequests.set(`${req?.route?.path} - ${action} - ${requestId}`, time);
        console.log(`${route} - ${action}: received request`);

        return requestId;
    }

    const resolve = (req, id) => {
        const route = req?.route?.path
        const action = Object.entries(req?.route?.methods).filter(([action, value]) => value)?.[0]?.[0]

        const requestID = `${route} - ${action} - ${id}`;
        const receiveTime = activeRequests.get(requestID);
        const responseTime = new Date();

        activeRequests.delete(requestID);
        console.log(`${route} - ${action}: responded in ${responseTime - receiveTime}ms`)
    }

    const error = (req, id) => {
        const route = req?.route?.path
        const action = Object.entries(req?.route?.methods).filter(([action, value]) => value)?.[0]?.[0]

        const requestID = `${route} - ${action} - ${id}`;

        const receiveTime = activeRequests.get(requestID);
        const responseTime = new Date();

        activeRequests.delete(requestID);
        console.log(`${route} - ${action}: failed in ${responseTime - receiveTime}ms`)
    }

    return {
        receive,
        resolve,
        error
    }
} 