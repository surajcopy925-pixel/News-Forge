export function getCategoryStyle(category: string) {
  switch (category?.toUpperCase()) {
    case 'HEADLINES': return 'bg-red-500/20 text-red-400 border border-red-500/30'
    case 'BREAKING': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
    case 'STATE': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    case 'NATIONAL': return 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
    case 'INTERNATIONAL': return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
    case 'SPORTS': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    case 'BUSINESS': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    case 'ENTERTAINMENT': return 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
    case 'BREAK': return 'bg-gray-800 text-gray-500 border border-gray-700'
    default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
  }
}

export function getStatusStyle(status: string) {
  switch (status?.toUpperCase()) {
    case 'READY':
    case 'COMPLETED':
    case 'APPROVED':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    case 'IN_PROCESS':
    case 'CLAIMED':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    case 'NOT READY':
    case 'PENDING':
    case 'FAILED':
      return 'bg-red-500/10 text-red-400 border border-red-500/20'
    case 'AVAILABLE':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
    default:
      return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
  }
}
