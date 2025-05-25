import { z } from 'zod';
export declare const LoadProfileSchema: z.ZodObject<{
    rampUp: z.ZodNumber;
    users: z.ZodNumber;
    steady: z.ZodNumber;
    rampDown: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    rampUp: number;
    users: number;
    steady: number;
    rampDown: number;
}, {
    rampUp: number;
    users: number;
    steady: number;
    rampDown: number;
}>;
export declare const RequestConfigSchema: z.ZodObject<{
    method: z.ZodEnum<["GET", "POST", "PUT", "DELETE", "PATCH"]>;
    url: z.ZodString;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    queryParams: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    body: z.ZodOptional<z.ZodString>;
    attachmentId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    url: string;
    headers?: Record<string, string> | undefined;
    queryParams?: Record<string, string> | undefined;
    body?: string | undefined;
    attachmentId?: string | undefined;
}, {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    url: string;
    headers?: Record<string, string> | undefined;
    queryParams?: Record<string, string> | undefined;
    body?: string | undefined;
    attachmentId?: string | undefined;
}>;
export declare const CreateSpecSchema: z.ZodObject<{
    name: z.ZodString;
    request: z.ZodObject<{
        method: z.ZodEnum<["GET", "POST", "PUT", "DELETE", "PATCH"]>;
        url: z.ZodString;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        queryParams: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        body: z.ZodOptional<z.ZodString>;
        attachmentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        url: string;
        headers?: Record<string, string> | undefined;
        queryParams?: Record<string, string> | undefined;
        body?: string | undefined;
        attachmentId?: string | undefined;
    }, {
        method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        url: string;
        headers?: Record<string, string> | undefined;
        queryParams?: Record<string, string> | undefined;
        body?: string | undefined;
        attachmentId?: string | undefined;
    }>;
    loadProfile: z.ZodObject<{
        rampUp: z.ZodNumber;
        users: z.ZodNumber;
        steady: z.ZodNumber;
        rampDown: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        rampUp: number;
        users: number;
        steady: number;
        rampDown: number;
    }, {
        rampUp: number;
        users: number;
        steady: number;
        rampDown: number;
    }>;
    attachmentId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    request: {
        method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        url: string;
        headers?: Record<string, string> | undefined;
        queryParams?: Record<string, string> | undefined;
        body?: string | undefined;
        attachmentId?: string | undefined;
    };
    loadProfile: {
        rampUp: number;
        users: number;
        steady: number;
        rampDown: number;
    };
    attachmentId?: string | undefined;
}, {
    name: string;
    request: {
        method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        url: string;
        headers?: Record<string, string> | undefined;
        queryParams?: Record<string, string> | undefined;
        body?: string | undefined;
        attachmentId?: string | undefined;
    };
    loadProfile: {
        rampUp: number;
        users: number;
        steady: number;
        rampDown: number;
    };
    attachmentId?: string | undefined;
}>;
export declare const UpdateSpecSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    request: z.ZodOptional<z.ZodObject<{
        method: z.ZodEnum<["GET", "POST", "PUT", "DELETE", "PATCH"]>;
        url: z.ZodString;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        queryParams: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        body: z.ZodOptional<z.ZodString>;
        attachmentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        url: string;
        headers?: Record<string, string> | undefined;
        queryParams?: Record<string, string> | undefined;
        body?: string | undefined;
        attachmentId?: string | undefined;
    }, {
        method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        url: string;
        headers?: Record<string, string> | undefined;
        queryParams?: Record<string, string> | undefined;
        body?: string | undefined;
        attachmentId?: string | undefined;
    }>>;
    loadProfile: z.ZodOptional<z.ZodObject<{
        rampUp: z.ZodNumber;
        users: z.ZodNumber;
        steady: z.ZodNumber;
        rampDown: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        rampUp: number;
        users: number;
        steady: number;
        rampDown: number;
    }, {
        rampUp: number;
        users: number;
        steady: number;
        rampDown: number;
    }>>;
    attachmentId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    attachmentId?: string | undefined;
    request?: {
        method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        url: string;
        headers?: Record<string, string> | undefined;
        queryParams?: Record<string, string> | undefined;
        body?: string | undefined;
        attachmentId?: string | undefined;
    } | undefined;
    loadProfile?: {
        rampUp: number;
        users: number;
        steady: number;
        rampDown: number;
    } | undefined;
}, {
    name?: string | undefined;
    attachmentId?: string | undefined;
    request?: {
        method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        url: string;
        headers?: Record<string, string> | undefined;
        queryParams?: Record<string, string> | undefined;
        body?: string | undefined;
        attachmentId?: string | undefined;
    } | undefined;
    loadProfile?: {
        rampUp: number;
        users: number;
        steady: number;
        rampDown: number;
    } | undefined;
}>;
export declare const RunParamsSchema: z.ZodObject<{
    specId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    specId: string;
}, {
    specId: string;
}>;
export declare const RunIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const SpecIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
//# sourceMappingURL=validation.d.ts.map