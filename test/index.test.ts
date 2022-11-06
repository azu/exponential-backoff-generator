import { generateBackoff } from "../src/index";
import * as assert from "assert";

const doSuccessAsync = async (maxRetries: number) => {
    const rejectOrResolve = (attempts: number) => {
        if (attempts === maxRetries) {
            return Promise.resolve("value");
        } else {
            return Promise.reject(new Error("reject"));
        }
    };
    const backoff = generateBackoff({
        retries: maxRetries,
        min: 1,
        max: 100
    });
    for (const { sleep, attempts } of backoff) {
        try {
            return await rejectOrResolve(attempts);
        } catch {
            await sleep();
        }
    }
    throw new Error("doSuccessAsync failed at all");
};
const doFailedAsync = async (maxRetries: number) => {
    const reject = () => {
        return Promise.reject(new Error("reject"));
    };
    const backoff = generateBackoff({
        retries: maxRetries,
        min: 1,
        max: 100
    });
    for (const { sleep } of backoff) {
        try {
            return await reject();
        } catch {
            await sleep();
        }
    }
    throw new Error("doFailedAsync failed at all");
};
describe("generateBackoff", function () {
    it("generate duration with default value", () => {
        const backoff = generateBackoff();
        const generated = Array.from(backoff, ({ duration }) => duration);
        assert.deepStrictEqual(generated, [100, 200, 400, 800, 1600, 3200, 6400, 10000]);
    });
    it("generate duration with custom min value", () => {
        const backoff = generateBackoff({
            min: 1000
        });
        const generated = Array.from(backoff, ({ duration }) => duration);
        assert.deepStrictEqual(generated, [1000, 2000, 4000, 8000, 10000, 10000, 10000, 10000]);
    });
    it("generate duration with custom max value", () => {
        const backoff = generateBackoff({
            min: 1000,
            max: 50 * 1000
        });
        const generated = Array.from(backoff, ({ duration }) => duration);
        assert.deepStrictEqual(generated, [1000, 2000, 4000, 8000, 16000, 32000, 50000, 50000]);
    });
    it("generate duration with custom factor ", () => {
        const backoff = generateBackoff({
            factor: 3
        });
        const generated = Array.from(backoff, ({ duration }) => duration);
        assert.deepStrictEqual(generated, [100, 300, 900, 2700, 8100, 10000, 10000, 10000]);
    });
    it("generate duration with custom factor ", () => {
        const backoff = generateBackoff({
            jitter: 0.5
        });
        const generated = Array.from(backoff, ({ duration }) => duration);
        const defaultGenerated = [100, 200, 400, 800, 1600, 3200, 6400, 10000];
        generated.forEach((duration, index) => {
            assert.ok(
                defaultGenerated[index] - defaultGenerated[index] * 0.5 <= duration &&
                    duration <= defaultGenerated[index] + defaultGenerated[index] * 0.5,
                `{${index}} ${duration}`
            );
        });
    });
    it("doSuccessAsync work success", async () => {
        const maxRetries = 4;
        const result = await doSuccessAsync(maxRetries);
        assert.strictEqual(result, "value");
    });
    it("doFailedAsync throw error", async () => {
        const maxRetries = 4;
        await assert.rejects(() => {
            return doFailedAsync(maxRetries);
        }, /doFailedAsync failed at all/);
    });
});
