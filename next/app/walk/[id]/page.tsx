import ItemBox from "../../../lib/components/item-box";
import { searchAction } from "../../lib/walk-actions"

export default async function Page({ params }: Promise<{  id: string  }>) {
    const { id } = await params;
    return (
        <ItemBox id={id} />
    );
}

export async function generateMetadata({ params }) {
    const searchState = {
        rows: [],
        count: 0,
        offset: 0,
        error: null,
        idTokenExpired: false,
        index: -1,
        curernt: null,
        serial: 0,
    }
    const { id } = await params;
    console.log('generateMetadata', id);
    const newState = await searchAction(searchState, {id});
    if (!newState.current) {
        return {
            title: newState.error ? 'Error' : 'Not Found',
            description: newState.error ? newState.error : 'Not Found',
        }
    }
    const item = newState.current
    const title = `${item.date} : ${item.title} (${item.length.toFixed(1)} km)`
    const description = item.comment && (`${item.comment.replace(/[\n\r]/g, '').substring(0, 140)}...`);
    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: `/walk/${id}`,
            images: [
                {
                    url: item.image,
                },
            ],
        },
    }
}