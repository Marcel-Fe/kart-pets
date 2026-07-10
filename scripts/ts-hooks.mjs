// Node verlangt Dateiendungen, Vite nicht. Ergaenzt '.ts' bei relativen Importen.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (err) {
    if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      return await next(specifier + '.ts', context)
    }
    throw err
  }
}
