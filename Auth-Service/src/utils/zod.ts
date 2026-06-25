import { ZodError } from 'zod';

const formatZodError = (error: ZodError): string => {
    return error.issues.map(issue => issue.message).join(', ');
};

export { formatZodError }