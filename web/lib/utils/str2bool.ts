export default function str2bool(value: string | undefined): boolean {
  if (value === undefined || value === null) {
    return false
  } else {
    const lc = value.toLowerCase().trim()
    if (
      lc === '' ||
      lc === 'false' ||
      lc === '0' ||
      lc === 'no' ||
      lc === 'off' ||
      lc === 'null' ||
      lc === 'undefined'
    ) {
      return false
    }
    return true
  }
}
