import * as lua from "LuaAST";
import ts from "byots";
import { TransformState } from "TSTransformer/TransformState";
import { transformExpression } from "TSTransformer/nodes/expressions/transformExpression";
import { binaryExpressionChain } from "TSTransformer/util/binaryExpressionChain";
import { isStringType } from "TSTransformer/util/types";

export function transformTemplateExpression(state: TransformState, node: ts.TemplateExpression) {
	if (node.templateSpans.length === 0) {
		return lua.string(node.head.text);
	}

	const expressions = new Array<lua.Expression>();

	if (node.head.text.length > 0) {
		expressions.push(lua.string(node.head.text));
	}

	for (const templateSpan of node.templateSpans) {
		let exp = transformExpression(state, templateSpan.expression);
		if (!isStringType(state, state.getType(templateSpan.expression))) {
			exp = lua.create(lua.SyntaxKind.CallExpression, {
				expression: lua.globals.tostring,
				args: lua.list.make(exp),
			});
		}
		expressions.push(exp);

		if (templateSpan.literal.text.length > 0) {
			expressions.push(lua.string(templateSpan.literal.text));
		}
	}

	return binaryExpressionChain(expressions, "..");
}
