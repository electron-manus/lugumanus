import type { PreviewListItem } from '@lugu-manus/share';
import { Avatar, Input, List } from 'antd';
import { When } from 'react-if';

export default function ListPreview(props: { search?: string; data: PreviewListItem[] }) {
  const data = props.data;

  return (
    <div>
      <When condition={Boolean(props.search)}>
        <div className="text-sm text-gray-400 px-24 pb-4">
          <Input.Search placeholder="搜索..." value={props.search} size="large" />
        </div>
      </When>
      <List
        itemLayout="horizontal"
        dataSource={data}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={item.avatar ? <Avatar src={item.avatar} /> : null}
              title={<a href={item.url ?? '#'}>{item.title}</a>}
              description={item.description}
            />
          </List.Item>
        )}
      />
    </div>
  );
}
