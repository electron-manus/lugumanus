import type { StudioActionForRenderer } from '@lugu-manus/share';
import clsx from 'clsx';
import ListPreview from './ListPreview';

function StudioPreview(props: { action: StudioActionForRenderer | null }) {
  const action = props.action;
  return (
    <div
      className={clsx('h-full w-full overflow-auto bg-gray-900 bg-opacity-35 p-6', {
        'animate-pulse': !action,
      })}
    >
      {action?.type === 'showSearchResults' ? (
        <ListPreview search={action?.payload.query} data={action?.payload.searchResults} />
      ) : null}
    </div>
  );
}

export default StudioPreview;
