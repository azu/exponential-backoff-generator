export type BackoffOptions = {
    // max retry count
    // Default: 7
    retries?: number;
    // Initial timeout in milliseconds
    // Default: 100
    // Note: `min` should be grater than 0.
    min?: number;
    // max timeout in milliseconds
    // Default: 10 * 1000(10 seconds)
    max?: number;
    // Timeout will be multiplied by Factor.
    // Default: 2
    // Default durations are 2 * 100, 4 * 100, 8 * 100, 16 * 100, 32 * 100
    factor?: number;
    // Adding random jitter to each duration
    // jitter value should be 0 - 1.0
    // jitter value is seed value for Math.random().
    // Default: 0
    // For more details, see https://aws.amazon.com/jp/blogs/architecture/exponential-backoff-and-jitter/
    jitter?: number;
};

export function* generateBackoff(options?: BackoffOptions) {
    // options
    const retries = options && options.retries !== undefined ? options.retries : 7;
    const min = options && options.min !== undefined ? options.min : 100;
    const max = options && options.max !== undefined ? options.max : 10 * 1000;
    const factor = options && options.factor !== undefined ? options.factor : 2;
    const jitter = options && options.jitter !== undefined ? options.jitter : 0;
    // assertion
    if (min <= 0) {
        throw new Error(`Invalid option: options.min > 0`);
    }
    if (jitter < 0 || jitter > 1) {
        throw new Error(`Invalid option: options.jitter 0 - 1`);
    }
    // state
    let attempts = 0;
    // next step
    while (attempts <= retries) {
        // compute next duration
        const duration = computeDuration({ attempts, factor, jitter, min, max });
        yield {
            // current try count
            attempts,
            // current duration for sleep
            duration,
            // sleep function return a promise that will be resolved after duration
            sleep() {
                return new Promise((resolve) => {
                    setTimeout(resolve, duration);
                });
            }
        };
        attempts++;
    }
}

function computeDuration({
    factor,
    attempts,
    jitter,
    min,
    max
}: {
    factor: number;
    attempts: number;
    jitter: number;
    min: number;
    max: number;
}) {
    let ms = min * Math.pow(factor, attempts);
    if (jitter) {
        const rand = Math.random();
        const deviation = Math.floor(rand * jitter * ms);
        ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
    }
    return Math.min(ms, max) | 0;
}
