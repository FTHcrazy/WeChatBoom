import GridLayout from './components/GirdLayout'
import { useContactStore } from '../../store'
import { useGenerationRange } from '../../hooks'
import { useEffect } from 'react'
import { Spin } from "antd"

export default function Contact() {
  const contacts = useContactStore((state) => state.contacts)
  const clearContacts = useContactStore((state) => state.clearContacts)

  const { fetchData, loading, loadMore } = useGenerationRange()

  useEffect(() => {
    clearContacts()
    fetchData(true)
  }, [])



  return (
    <div className='w-full h-full'>
      <Spin spinning={loading}/>
      <GridLayout
        totalCount={contacts.length}
        endReached={loadMore}
        hasMore={contacts.length > 100 ? false : true} />
    </div>
  )
}
