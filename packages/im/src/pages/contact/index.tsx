import GridLayout from './components/GirdLayout'
import { useContactStore } from '../../store'
import { useGenerationRange } from '../../hooks'
import { useEffect } from 'react'

export default function Contact() {
  const contacts = useContactStore((state) => state.contacts)
  const clearContacts = useContactStore((state) => state.clearContacts)

  const { fetchData, loading, loadMore } = useGenerationRange()

  useEffect(() => {
    clearContacts()
    fetchData()
  }, [])



  return (
    <div className='w-full h-full'>
      <GridLayout totalCount={contacts.length} loadMore={loadMore} />
    </div>
  )
}
