// @ts-nocheck -- skip type checking
import * as meta_1 from "../content/docs/api/meta.json?collection=meta&hash=1762910184140"
import * as meta_0 from "../content/docs/meta.json?collection=meta&hash=1762910184140"
import * as docs_4 from "../content/docs/api/inventory.mdx?collection=docs&hash=1762910184140"
import * as docs_3 from "../content/docs/api/index.mdx?collection=docs&hash=1762910184140"
import * as docs_2 from "../content/docs/api/clients.mdx?collection=docs&hash=1762910184140"
import * as docs_1 from "../content/docs/index.mdx?collection=docs&hash=1762910184140"
import * as docs_0 from "../content/docs/authentication.mdx?collection=docs&hash=1762910184140"
import { _runtime } from "fumadocs-mdx/runtime/next"
import * as _source from "../source.config"
export const docs = _runtime.doc<typeof _source.docs>([{ info: {"path":"authentication.mdx","fullPath":"content/docs/authentication.mdx"}, data: docs_0 }, { info: {"path":"index.mdx","fullPath":"content/docs/index.mdx"}, data: docs_1 }, { info: {"path":"api/clients.mdx","fullPath":"content/docs/api/clients.mdx"}, data: docs_2 }, { info: {"path":"api/index.mdx","fullPath":"content/docs/api/index.mdx"}, data: docs_3 }, { info: {"path":"api/inventory.mdx","fullPath":"content/docs/api/inventory.mdx"}, data: docs_4 }]);
export const meta = _runtime.meta<typeof _source.meta>([{ info: {"path":"meta.json","fullPath":"content/docs/meta.json"}, data: meta_0 }, { info: {"path":"api/meta.json","fullPath":"content/docs/api/meta.json"}, data: meta_1 }]);