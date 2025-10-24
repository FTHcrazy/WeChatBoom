
import { forwardRef } from 'react'
import { VirtuosoGrid } from 'react-virtuoso'
import type { GridItemProps, GridListProps, GridComponents } from 'react-virtuoso'
import { Skeleton, Space } from "antd"
import TiltedCard from '../TiltedCard'
import { useContactStore } from '../../../../store'

interface GridLayoutProps {
    hasMore?: boolean;
    totalCount?: number;
    endReached?: () => void;
}


const gridComponents: GridComponents = {
    List: forwardRef<HTMLDivElement, GridListProps>(({ style, children, ...props }, ref) => (
        <div
            ref={ref}
            {...props}
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                ...style
            }}
        >
            {children}
        </div>
    )),
    Item: ({ children, style, ...props }: GridItemProps) => (
        <div
            {...props}
            style={{
                padding: '0.5rem',
                width: '33%',
                display: 'flex',
                flex: 'none',
                alignContent: 'stretch',
                boxSizing: 'border-box',
                ...style
            }}
        >
            {children}
        </div>
    ),
    Footer: (props) => {
        console.log('footer', props)
        return <Space.Compact block>
            <Skeleton.Image active />
            <Skeleton.Image active />
            <Skeleton.Image active />
        </Space.Compact>
    }
}


export default function GridLayout(props: GridLayoutProps) {
    const contacts = useContactStore((state) => state.contacts)
    const { hasMore, totalCount, endReached } = props
    return (
        <VirtuosoGrid
            style={{ height: '100%' }}
            context={{ hasMore }}
            components={gridComponents}
            endReached={endReached}
            totalCount={totalCount}
            itemContent={(index) => <TiltedCard imageSrc={contacts[index].image}
                altText={contacts[index].name}
                captionText={contacts[index].name}
                containerHeight="300px"
                containerWidth="100%"
                imageHeight="300px"
                imageWidth="100%"
                rotateAmplitude={12}
                scaleOnHover={1.2}
                showMobileWarning={false}
                showTooltip={true}
                displayOverlayContent={true}
            />}
        />
    )
}
