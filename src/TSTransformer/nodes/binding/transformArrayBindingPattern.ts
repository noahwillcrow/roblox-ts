import ts from "byots";
import * as lua from "LuaAST";
import { assert } from "Shared/util/assert";
import { TransformState } from "TSTransformer";
import { diagnostics } from "TSTransformer/diagnostics";
import { transformObjectBindingPattern } from "TSTransformer/nodes/binding/transformObjectBindingPattern";
import { transformVariable } from "TSTransformer/nodes/statements/transformVariableStatement";
import { transformInitializer } from "TSTransformer/nodes/transformInitializer";
import { getAccessorForBindingType } from "TSTransformer/util/binding/getAccessorForBindingType";

export function transformArrayBindingPattern(
	state: TransformState,
	bindingPattern: ts.ArrayBindingPattern,
	parentId: lua.AnyIdentifier,
) {
	let index = 0;
	const idStack = new Array<lua.AnyIdentifier>();
	const accessor = getAccessorForBindingType(state, bindingPattern, state.getType(bindingPattern));
	for (const element of bindingPattern.elements) {
		if (ts.isOmittedExpression(element)) {
			accessor(state, parentId, index, idStack, true);
		} else {
			if (element.dotDotDotToken) {
				state.addDiagnostic(diagnostics.noDotDotDotDestructuring(element));
				return;
			}
			const name = element.name;
			const value = accessor(state, parentId, index, idStack, false);
			if (ts.isIdentifier(name)) {
				const { expression: id, statements } = transformVariable(state, name, value);
				state.prereqList(statements);
				assert(lua.isAnyIdentifier(id));
				if (element.initializer) {
					state.prereq(transformInitializer(state, id, element.initializer));
				}
			} else {
				const id = state.pushToVar(value);
				if (element.initializer) {
					state.prereq(transformInitializer(state, id, element.initializer));
				}
				if (ts.isArrayBindingPattern(name)) {
					transformArrayBindingPattern(state, name, id);
				} else {
					transformObjectBindingPattern(state, name, id);
				}
			}
		}
		index++;
	}
}
