import { z } from "zod/v4";
import { ICommand } from "./interfaces/command";

export type Options<T extends ICommand> = T['opts'] extends z.ZodType ? z.infer<T['opts']> : never
