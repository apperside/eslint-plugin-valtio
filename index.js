'use strict'

Object.defineProperty(exports, '__esModule', { value: true })

var callExpressions = ['JSXExpressionContainer', 'CallExpression']
var functionTypes = ['ArrowFunctionExpression', 'FunctionExpression']
var writingOpExpressionTypes = ['UpdateExpression']
var exportDeclarations = ['ExportDefaultDeclaration', 'ExportNamedDeclaration']
function isInSomething(node, thing) {
  if (node.parent && node.parent.type !== thing) {
    return isInSomething(node.parent, thing)
  } else if (node.parent && node.parent.type === thing) {
    return true
  }

  return false
}
function nearestCalleeName(node) {
  if (!(node && node.parent)) {
    return false
  }

  var hasCallee = node.parent.callee

  if (!hasCallee) {
    return nearestCalleeName(node.parent)
  }

  var isCalleeIdentifier = node.parent.callee.type === 'Identifier'
  var isCalleeMember = node.parent.callee.type === 'MemberExpression'

  if (isCalleeIdentifier) {
    return node.parent.callee.name
  }

  if (isCalleeMember) {
    return node.parent.callee.property.name
  }

  return nearestCalleeName(node.parent)
}
function getParentOfNodeType(node, nodeType) {
  if (!(node != null && node.parent)) {
    return null
  }

  if (node.parent && node.parent.type !== nodeType) {
    return getParentOfNodeType(node.parent, nodeType)
  } else if (node.parent && node.parent.type === nodeType) {
    return node.parent
  }

  return null
}
function isReadOnly(node) {
  if (writingOpExpressionTypes.indexOf(node.parent.type) > -1) {
    return false
  }

  if (node.parent.type === 'AssignmentExpression' && isLeftOfAssignment(node)) {
    return false
  }

  if (node.parent.type === 'MemberExpression') {
    return isReadOnly(node.parent)
  }

  if (node.parent.type === 'CallExpression') {
    return true
  }

  return true
}
function isLeftOfAssignment(node) {
  if (Object.is(node.parent.left, node)) {
    return true
  }

  return false
}
function isInReactHooks(node, returnHook) {
  if (returnHook === void 0) {
    returnHook = false
  }

  var hookDef = getNearestHook(node)

  if (returnHook) {
    return hookDef
  }

  return hookDef ? true : false
}

function isInSupportedReactPrimitives(node) {
  var supportedPrimitives = ['useEffect', 'useCallback', 'useMemo']

  if (node.type === 'Identifier') {
    return supportedPrimitives.includes(node.name)
  }

  if (node.type === 'MemberExpression') {
    var flatExpr = flattenMemberExpression(node)
    return supportedPrimitives.some(function (d) {
      return flatExpr.endsWith(d)
    })
  }

  return false
}

function getNearestHook(node) {
  if (!node.parent || !node.parent.type) return false
  var parentCaller = getParentOfNodeType(node, 'CallExpression')

  if (!parentCaller) {
    return false
  }

  if (!isInSupportedReactPrimitives(parentCaller.callee)) {
    return getNearestHook(parentCaller)
  }

  return parentCaller
}
function isInReactHookDeps(node) {
  var hookNode = isInReactHooks(node, true)

  if (!hookNode) {
    return false
  }

  var allDepExpressions = getHookDeps(hookNode)
  var depPath = ''

  if (node.parent.type === 'MemberExpression') {
    var rootMemberExpressionForNode = getRootMemberExpression(node)
    depPath = flattenMemberExpression(rootMemberExpressionForNode)
  } else {
    depPath = (node.type === 'Identifier' && node.name) || false
  }

  if (!depPath) {
    return false
  }

  var flatDepPaths = []
  ;(allDepExpressions.elements || []).forEach(function (exprNode) {
    var exprPath

    if (exprNode.type === 'MemberExpression') {
      exprPath = flattenMemberExpression(exprNode)
    } else {
      exprPath = exprNode.name
    }

    flatDepPaths.push(exprPath)
  })
  return flatDepPaths.indexOf(depPath) > -1
}
function getHookDeps(hookNode) {
  if (!hookNode) {
    return false
  }

  if (hookNode.type !== 'CallExpression') {
    return false
  }

  if (
    !(
      hookNode.arguments.length == 2 &&
      hookNode.arguments[1] &&
      hookNode.arguments[1].type === 'ArrayExpression'
    )
  ) {
    return false
  }

  return hookNode.arguments[1]
}

function flattenMemberExpression(exprNode, path) {
  if (path === void 0) {
    path = []
  }

  if (exprNode.type !== 'MemberExpression') {
    return (path.length && path.join('.')) || ''
  }

  if (exprNode.property.type === 'Identifier') {
    path.unshift(exprNode.property.name)
  }

  if (exprNode.object.type === 'Identifier') {
    path.unshift(exprNode.object.name)
  } else if (exprNode.object.type === 'MemberExpression') {
    flattenMemberExpression(exprNode.object, path)
  }

  return (path.length && path.join('.')) || ''
}

function isFuncDepthSameAsRoot(node) {
  var _parentFunc$parent,
    _parentFunc$parent2,
    _parentFunc$parent2$p,
    _parentFunc$parent3,
    _parentFunc$parent3$p,
    _parentFunc$parent3$p2,
    _parentFunc$parent4,
    _parentFunc$parent4$p,
    _parentFunc$parent4$p2

  var varDef = getParentOfNodeType(node, 'VariableDeclaration')
  var parentNormalFunc = getParentOfNodeType(varDef, 'FunctionDeclaration')
  var parentArrFunc = getParentOfNodeType(varDef, 'ArrowFunctionExpression')
  var parentFunc = parentNormalFunc || parentArrFunc

  if (!parentFunc) {
    return false
  }

  if (isInRefOrMemo(parentFunc.parent)) {
    return true
  }

  var isParentVDeclarationGroup =
    (parentFunc == null
      ? void 0
      : (_parentFunc$parent = parentFunc.parent) == null
      ? void 0
      : _parentFunc$parent.type) === 'VariableDeclarator' &&
    (parentFunc == null
      ? void 0
      : (_parentFunc$parent2 = parentFunc.parent) == null
      ? void 0
      : (_parentFunc$parent2$p = _parentFunc$parent2.parent) == null
      ? void 0
      : _parentFunc$parent2$p.type) === 'VariableDeclaration'

  if (
    isParentVDeclarationGroup &&
    ((parentFunc == null
      ? void 0
      : (_parentFunc$parent3 = parentFunc.parent) == null
      ? void 0
      : (_parentFunc$parent3$p = _parentFunc$parent3.parent) == null
      ? void 0
      : (_parentFunc$parent3$p2 = _parentFunc$parent3$p.parent) == null
      ? void 0
      : _parentFunc$parent3$p2.type) === 'Program' ||
      exportDeclarations.indexOf(
        parentFunc == null
          ? void 0
          : (_parentFunc$parent4 = parentFunc.parent) == null
          ? void 0
          : (_parentFunc$parent4$p = _parentFunc$parent4.parent) == null
          ? void 0
          : (_parentFunc$parent4$p2 = _parentFunc$parent4$p.parent) == null
          ? void 0
          : _parentFunc$parent4$p2.type
      ) > -1)
  ) {
    return true
  }

  return false
}
function isInCustomHookDef(node) {
  var _varDefOfFunc$parent, _varDeclaratorOfFunc$, _varDeclaratorOfFunc$2

  var nearestReturn = getParentOfNodeType(node, 'ReturnStatement')
  var returnInBlock = getParentOfNodeType(nearestReturn, 'BlockStatement')
  var normalFuncDef = getParentOfNodeType(
    returnInBlock,
    'ArrowFunctionExpression'
  )
  var arrowFuncDef = getParentOfNodeType(returnInBlock, 'FunctionExpression')
  var nearestFuncDef = normalFuncDef || arrowFuncDef || false

  if (!nearestFuncDef) {
    return false
  }

  var varDeclaratorOfFunc = getParentOfNodeType(
    nearestFuncDef,
    'VariableDeclarator'
  )
  var varDefOfFunc = getParentOfNodeType(
    varDeclaratorOfFunc,
    'VariableDeclaration'
  )
  var varDefOnRoot =
    ((_varDefOfFunc$parent = varDefOfFunc.parent) == null
      ? void 0
      : _varDefOfFunc$parent.type) === 'Program' || false
  return (
    varDefOnRoot &&
    ((_varDeclaratorOfFunc$ = varDeclaratorOfFunc.id) == null
      ? void 0
      : _varDeclaratorOfFunc$.type) === 'Identifier' &&
    ((_varDeclaratorOfFunc$2 = varDeclaratorOfFunc.id) == null
      ? void 0
      : _varDeclaratorOfFunc$2.name.startsWith('use'))
  )
}

function isInRefOrMemo(node) {
  var validCalleeNames = ['memo', 'forwardRef']

  if (node.type === 'CallExpression') {
    var callee = node.callee

    if (validCalleeNames.indexOf(callee.name) > -1) {
      return true
    }

    if (
      callee.type === 'MemberExpression' &&
      callee.object.name === 'React' &&
      validCalleeNames.indexOf(callee.property.name) > -1
    ) {
      return true
    }
  }
}

function getRootMemberExpression(node) {
  if (node.parent.type === 'MemberExpression') {
    return getRootMemberExpression(node.parent)
  }

  return node
}

function isHookName(name) {
  return /^use[A-Z0-9]/.test(name)
}
function isComponentName(name) {
  return /^[A-Z]/.test(name)
}
function isFunctionHookOrComponent(node) {
  if (node.type === 'ArrowFunctionExpression') {
    var _varDef$id

    var varDef = getParentOfNodeType(node, 'VariableDeclarator')
    var name =
      (varDef == null
        ? void 0
        : (_varDef$id = varDef.id) == null
        ? void 0
        : _varDef$id.name) || ''
    return isHookName(name) || isComponentName(name)
  }

  if (node.type === 'FunctionExpression') {
    var _node$id

    var _name = ((_node$id = node.id) == null ? void 0 : _node$id.name) || ''

    return isHookName(_name) || isComponentName(_name)
  }
}

var PROXY_RENDER_PHASE_MESSAGE =
  'Using proxies in the render phase would cause unexpected problems.'
var SNAPSHOT_CALLBACK_MESSAGE = 'Better to just use proxy state.'
var UNEXPECTED_STATE_MUTATING =
  "Mutating a proxy object itself. this might not be expected as it's not reactive."
var COMPUTED_DECLARATION_ORDER =
  'Not found, If a computed field deriving value is created from another computed, the computed source should be declared first.'
var StateSnapshot = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Warns about unexpected problems',
      category: 'Unexpected Problems',
      recommended: 'true',
    },
  },
  create: function create(context) {
    var sourceCode = context.sourceCode || context.getSourceCode()
    var getScope =
      'getScope' in context
        ? context.getScope.bind(context)
        : sourceCode.getScope.bind(sourceCode)
    return {
      Identifier: function Identifier(node) {
        var scope = getScope(node)

        if (isInComputed(node) && isInProperty(node)) {
          if (
            isInMemberExpression(node) &&
            returnFirstObjectIdentifier(outerMemberExpression(node)) ===
              node.name &&
            isComputedIdentifier(node, scope) &&
            returnComputedValues(node)[0].includes(
              returnSecondObjectIdentifier(outerMemberExpression(node))
            ) &&
            !returnComputedValues(node)[1].includes(
              returnSecondObjectIdentifier(outerMemberExpression(node))
            )
          ) {
            return context.report({
              node: outerMemberExpression(node),
              message: COMPUTED_DECLARATION_ORDER,
            })
          } else if (
            isInObjectPattern(node) &&
            isInParams(node) &&
            node.parent.key === node &&
            !returnComputedValues(node)[1].includes(node.name) &&
            returnComputedValues(node)[0].includes(node.name)
          ) {
            return context.report({
              node: node,
              message: COMPUTED_DECLARATION_ORDER,
            })
          }
        }

        if (
          (isInAssignmentExpression(node) &&
            !isInMemberExpression(node) &&
            isUsedInUseProxy(node, scope)) ||
          (isInAssignmentExpression(node) &&
            isInMemberExpression(node) &&
            ((outerMemberExpression(node).property === node &&
              isUsedInUseProxy(outerMemberExpression(node), scope)) ||
              (node.parent.object === node &&
                isLiteral(node) &&
                isUsedInUseProxy(outerMemberExpression(node), scope))))
        ) {
          return context.report({
            node: node.parent.parent,
            message: UNEXPECTED_STATE_MUTATING,
          })
        }

        if (
          node.parent.type === 'MemberExpression' &&
          node.parent.property === node
        ) {
          return
        }

        var kind = which(node.name, scope)

        if (kind === 'state') {
          if (isInRender(node)) {
            return context.report({
              node: node,
              message: PROXY_RENDER_PHASE_MESSAGE,
            })
          }
        }

        if (kind === 'snapshot') {
          if (isReadOnly(node)) {
            if (
              isInCallback(node) &&
              !isInJSXContainer(node) &&
              !isInReactHooks(node) &&
              !isInCustomHookDef(node)
            ) {
              return context.report({
                node: node,
                message: SNAPSHOT_CALLBACK_MESSAGE,
              })
            }

            if (isInReactHooks(node) && !isInReactHookDeps(node)) {
              return context.report({
                node: node,
                message: SNAPSHOT_CALLBACK_MESSAGE,
              })
            }

            if (
              isFuncDepthSameAsRoot(node) ||
              isInJSXContainer(node) ||
              isInCustomHookDef(node)
            ) {
              return
            }
          } else {
            return context.report({
              node: node,
              message: SNAPSHOT_CALLBACK_MESSAGE,
            })
          }

          if (isInCallback(node) && !isInReactHooks(node)) {
            return context.report({
              node: node,
              message: SNAPSHOT_CALLBACK_MESSAGE,
            })
          }
        }
      },
    }
  },
}

function outerMemberExpression(node) {
  if (node.parent.type !== 'MemberExpression') {
    return node
  }

  return outerMemberExpression(node.parent)
}

function isInComputed(node) {
  if (
    node.parent &&
    node.parent.type === 'CallExpression' &&
    node.parent.callee.name === 'proxyWithComputed' &&
    node.parent.arguments[1] === node
  ) {
    return true
  } else if (node.parent) {
    return isInComputed(node.parent)
  }

  return false
}

function isInParams(node) {
  if (node.parent && node.parent.params && node.parent.params.includes(node)) {
    return true
  } else if (node.parent) {
    return isInParams(node.parent)
  }

  return false
}

function isInObjectPattern(node) {
  return isInSomething(node, 'ObjectPattern')
}

function returnComputedValues(node) {
  if (
    node.parent.parent &&
    node.parent.parent.type === 'CallExpression' &&
    node.parent.parent.callee.name === 'proxyWithComputed' &&
    node.parent.parent.arguments[1] === node.parent
  ) {
    return [
      node.parent.properties.map(function (v) {
        return v.key.name
      }),
      node.parent.properties
        .slice(0, node.parent.properties.indexOf(node) + 1)
        .map(function (v) {
          return v.key.name
        }),
    ]
  } else if (node.parent.parent) {
    return returnComputedValues(node.parent)
  }

  return []
}

function returnSecondObjectIdentifier(node) {
  if (
    node &&
    node.object.type === 'Identifier' &&
    node.property.type === 'Identifier'
  ) {
    return node.property.name
  } else if (
    node &&
    node.object.type === 'MemberExpression' &&
    node.property.type === 'Identifier'
  ) {
    return returnSecondObjectIdentifier(node.object)
  }

  return null
}

function returnFirstObjectIdentifier(node) {
  if (node && node.object.type === 'Identifier') {
    return node.object.name
  } else if (node && node.object.type === 'MemberExpression') {
    return returnFirstObjectIdentifier(node.object)
  }

  return null
}

function isComputedIdentifier(node, scope) {
  var firstIdentifier = returnFirstObjectIdentifier(outerMemberExpression(node))
  var isIt = false

  if (!scope) {
    return false
  }

  scope.variables.forEach(function (variable) {
    var def = variable.defs[0]
    if (!def || isIt) return
    var init = def.node.init
    if (init && init.type !== 'Parameter') return

    if (firstIdentifier === variable.name) {
      return (isIt = true)
    }
  })

  if (!isIt && scope.upper) {
    return (isIt = isComputedIdentifier(node, scope.upper))
  }

  return isIt
}

function isInMemberExpression(node) {
  return isInSomething(node, 'MemberExpression')
}

function isInProperty(node) {
  return isInSomething(node, 'Property')
}

function isInAssignmentExpression(node) {
  return (
    isInSomething(node, 'AssignmentExpression') ||
    isInSomething(node, 'UpdateExpression')
  )
}

function which(name, scope) {
  var kind = null
  if (!scope) return kind
  scope.variables.forEach(function (variable) {
    var def = variable.defs[0]
    if (!def || variable.name !== name) return

    if (def.type === 'ImportBinding') {
      var variableName = variable.name.toLowerCase()
      var isProxyLikeImport =
        variableName.includes('proxy') ||
        variableName.includes('state') ||
        variableName.includes('store')

      if (isProxyLikeImport) {
        return (kind = 'state')
      }

      return kind
    }

    var init = def.node.init
    if (!init) return

    if (init.type === 'Identifier') {
      return (kind = which(init.name, scope))
    } else if (init.type === 'CallExpression' && init.callee.name === 'proxy') {
      return (kind = 'state')
    } else if (
      init.type === 'CallExpression' &&
      init.callee.name === 'useSnapshot'
    ) {
      return (kind = 'snapshot')
    }
  })
  if (!kind && scope.upper) return (kind = which(name, scope.upper))
  return kind
}

function isSameMemmberExpression(first, second) {
  if (!first || !second) return false

  if (
    first.property.name === second.property.name ||
    first.property.value === second.property.value
  ) {
    if (
      (first.object._babelType === 'MemberExpression' &&
        second.object._babelType === 'MemberExpression') ||
      (first.object.type === 'MemberExpression' &&
        second.object.type === 'MemberExpression')
    ) {
      return isSameMemmberExpression(first.object, second.object)
    } else if (
      first.object.type === 'Identifier' &&
      second.object.type === 'Identifier'
    ) {
      return first.object.name === second.object.name
    }
  } else {
    return false
  }

  return false
}

function isUsedInUseProxy(node, scope) {
  var isUsed = false
  if (!scope) return isUsed
  scope.variables.forEach(function (variable) {
    var def = variable.defs[0]
    if (!def || isUsed) return
    var init = def.node.init
    if (!init || !init.arguments) return

    if (
      (init.parent._babelType === 'CallExpression' &&
        init.parent.callee.name === 'useSnapshot') ||
      (init._babelType === 'CallExpression' &&
        init.callee.name === 'useSnapshot') ||
      (init.parent.type === 'CallExpression' &&
        init.parent.callee.name === 'useSnapshot') ||
      (init.type === 'CallExpression' && init.callee.name === 'useSnapshot')
    ) {
      if (
        (init.arguments.length > 0 &&
          init.arguments[0] &&
          init.arguments[0]._babelType === 'MemberExpression' &&
          node._babelType === 'MemberExpression') ||
        (init.arguments[0] &&
          init.arguments[0].type === 'MemberExpression' &&
          node.type === 'MemberExpression')
      ) {
        return (isUsed = isSameMemmberExpression(node, init.arguments[0]))
      } else if (
        init.arguments[0].type === 'Identifier' &&
        node.type === 'Identifier' &&
        !isInMemberExpression(node)
      ) {
        return (isUsed = init.arguments[0].name === node.name)
      }
    }
  })

  if (!isUsed && scope.upper) {
    return (isUsed = isUsedInUseProxy(node, scope.upper))
  }

  return isUsed
}

function isInCallback(node) {
  if (!node.parent || !node.parent.type) return false

  if (
    (callExpressions.includes(node.parent.type) &&
      functionTypes.includes(node.type)) ||
    (['VariableDeclarator'].includes(node.parent.type) &&
      functionTypes.includes(node.type))
  ) {
    if (!isFunctionHookOrComponent(node)) {
      return true
    }
  } else {
    return isInCallback(node.parent)
  }
}

function isInRender(node) {
  if (!node.parent || !node.parent.type) return false
  var nearestCallbackNode =
    getParentOfNodeType(node, 'ArrowFunctionExpression') ||
    getParentOfNodeType(node, 'FunctionExpression')

  if (!nearestCallbackNode) {
    return isInJSXContainer(node)
  }

  var isCallbackInJSX = isInJSXContainer(nearestCallbackNode)
  return isInJSXContainer(node) && !isCallbackInJSX
}

function isLiteral(node) {
  var memberExpression = outerMemberExpression(node)
  return (
    memberExpression.property.type === 'Literal' ||
    memberExpression.property.type === 'NumericLiteral'
  )
}

function isInJSXContainer(node) {
  return (
    isInSomething(node, 'JSXExpressionContainer') ||
    isInSomething(node, 'JSXElement')
  )
}

var MESSAGE_THIS_IN_PROXY =
  'Avoid using `this` in valtio.proxy context.It might lead to unexpected results.\nUsing `this` is valid, but often a pitfall for beginners.'
var AvoidThisInProxy = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Warns about unexpected problems',
      category: 'Unexpected Problems',
      recommended: 'true',
    },
  },
  create: function create(context) {
    var identifiersList = []
    return {
      Identifier: function Identifier(node) {
        var cachedIdentifier = getIdentifier(identifiersList, node.name)

        if (
          cachedIdentifier &&
          cachedIdentifier.hasThis &&
          isCalledByProxy(node)
        ) {
          context.report({
            node: cachedIdentifier.thisNode,
            message: MESSAGE_THIS_IN_PROXY,
          })
        }
      },
      ThisExpression: function ThisExpression(node) {
        var parent = getParentOfNodeType(node, 'VariableDeclarator')

        if (!(parent && parent.id && parent.init)) {
          return
        }

        identifiersList.push({
          identifier: parent.id,
          definition: parent.init,
          thisNode: node,
          hasThis: true,
        })

        if (isInSomething(node, 'CallExpression') && isCalledByProxy(node)) {
          context.report({
            node: node,
            message: MESSAGE_THIS_IN_PROXY,
          })
        }
      },
    }
  },
}

function getIdentifier(allIdentifiers, identifier) {
  for (var i = 0; i < allIdentifiers.length; i++) {
    if (
      allIdentifiers[i] &&
      allIdentifiers[i].identifier &&
      allIdentifiers[i].identifier.name === identifier
    ) {
      return allIdentifiers[i]
    }
  }
}

function isCalledByProxy(node) {
  if (nearestCalleeName(node) !== 'proxy') {
    return false
  }

  return true
}

var plugin = {
  meta: {
    name: 'eslint-plugin-valtio',
  },
  rules: {
    'state-snapshot-rule': StateSnapshot,
    'avoid-this-in-proxy': AvoidThisInProxy,
  },
  configs: {},
}
Object.assign(plugin, {
  configs: {
    recommended: {
      plugins: ['valtio'],
      rules: {
        'valtio/state-snapshot-rule': 'warn',
        'valtio/avoid-this-in-proxy': 'warn',
      },
    },
    'flat/recommended': {
      plugins: {
        valtio: plugin,
      },
      rules: {
        'valtio/state-snapshot-rule': 'warn',
        'valtio/avoid-this-in-proxy': 'warn',
      },
    },
  },
})
module.exports = plugin
var configs = plugin.configs
var rules = plugin.rules

exports.configs = configs
exports.rules = rules
