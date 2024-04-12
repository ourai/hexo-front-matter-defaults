const { isString, isArray, isPlainObject } = require('@ntks/toolbox');

function resolveValuesFromLayout(layout, defaults) {
  if (!layout || !defaults[layout]) {
    return {};
  }

  const specificDefaults = defaults[layout];
  const extendedFrom = specificDefaults.extends && specificDefaults.extends !== layout ? resolveValuesFromLayout(specificDefaults.extends, defaults) : {};

  return { ...extendedFrom, ...specificDefaults.values };
}

function mergeValues(layoutValues, pageValues) {
  if (Object.keys(layoutValues).length === 0 || Object.keys(pageValues).length === 0) {
    return { ...layoutValues, ...pageValues };
  }

  const merged = { ...layoutValues };

  Object.entries(pageValues).forEach(([k, v]) => {
    merged[k] = isArray(v) && isArray(merged[k]) ? [...merged[k], ...v] : v;
  });

  return merged;
}

/**
 * the structure of `defaults` is just like what in Jekyll
 * @see https://jekyllrb.com/docs/configuration/front-matter-defaults/
 */
function resolvePageConfig(page, defaults) {
  let layoutDefaults;
  let pageDefaults;

  if (isArray(defaults)) {
    layoutDefaults = {};
    pageDefaults = defaults;
  } else if (isPlainObject(defaults)) {
    layoutDefaults = defaults.layout || {};
    pageDefaults = defaults.page || [];
  }

  let pageSource = page.source;

  if (!pageDefaults || pageDefaults.length === 0 || !pageSource) {
    return {};
  }

  let pageType = pageSource.split('/').shift();

  if (pageType[0] === '_') {
    pageSource = pageSource.slice(1);
    pageType = pageType.slice(1);
  }

  let resolved = {};

  pageDefaults.forEach(({ scope, values }) => {
    let scopePath;
    let scopeType;

    if (isString(scope)) {
      scopePath = scope;
    } else if (isPlainObject(scope)) {
      scopePath = scope.path;
      scopeType = scope.type;
    }

    if (!isString(scopePath)) {
      return;
    }

    let scopeValid = false;

    if (scopePath) {
      if (scopeType) {
        scopeValid = pageSource.startsWith(`${scopeType}/${scopePath}`);
      } else {
        scopeValid = pageSource.indexOf(scopePath) > -1;
      }
    } else {
      scopeValid = scopeType ? scopeType === pageType : true;
    }

    if (scopeValid) {
      resolved = { ...resolved, ...values };
    }
  });

  ['ksio_asset_css', 'ksio_asset_js'].forEach(k => {
    if (isArray(page[k]) && page[k].length > 0) {
      resolved[k] = page[k];
    }
  });

  return mergeValues(resolveValuesFromLayout(resolved.layout || page.layout, layoutDefaults), resolved);
}

hexo.extend.filter.register('template_locals', locals => {
  if (locals.config.ksio && locals.config.ksio.defaults ) {
    locals.page = { ...locals.page, ...resolvePageConfig(locals.page, locals.config.ksio.defaults) };
  }

  return locals;
});
