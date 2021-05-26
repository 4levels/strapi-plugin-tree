import React, { memo, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Wrapper } from "./components";
import { request } from "strapi-helper-plugin";
import Tree from 'rc-tree';
import { get, has } from "lodash";
// import { Tree } from 'antd';

const SortableTree = ({ uid, apiID, schema, children, labelField, description, style, title }) => {

  const formatData = (data, prefix, field) => {
    // enhance data format to match tree expected form
    // console.log('formatData data', data, 'prefix', prefix, 'field', field)
    if (!prefix) { prefix = '' }
    if (!data || !data.length || !field) { return [] }
    return data.map(entry => {
      // clear icon as it interferes with rc-tree
      const { children, title, icon, ...rest } = entry
      return {
        ...rest,
        key: `${prefix}_${entry.id}`,
        title: typeof entry[field] !== 'undefined' ? entry[field] : 'no clue why field is "' + field + '" ' + JSON.stringify(entry),
        children: children && formatData(children, `${prefix}_${entry.id}_children`, field) || []
      }
    })
  }

  const updateTitle = (data, field) => {
    if (!data || !data.length) { return [] }
    // console.log('updateTitle with data', data, 'field', field)
    return data.map(entry => {
      const { children, title, ...rest } = entry
      return {
        ...rest,
        title: typeof entry[field] !== 'undefined' ? entry[field] : (title || JSON.stringify(entry)),
        children: children && updateTitle(children, field) || null
      }
    })
  }


  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [autoExpandParent, setAutoExpandParent] = useState(true)
  const [expandedKeys, setExpandedKeys] = useState([])

  const getModelData = async () => {
    setIsLoading(true);
    if (!schema?.collectionName || !apiID) {
      return {}
    }
    try {
      const response = await request(`/${schema.collectionName}/`, {
        method: "GET"
      });

      setIsLoading(false);

      // console.log('modelsFound', modelsFound, 'vs models', models)
      return response;
    } catch (e) {
      setIsLoading(false)
      console.error(`${e}`)
      // strapi.notification.toggle({ type: 'error', message: `${e}` });
    }
    return {};
  };

  useEffect(() => {
    getModelData().then(data => {
      console.log('useEffect getModelData', data, 'formatted') //, formatData(data, `${apiID}_`, labelField), 'labelField', labelField)
      const formatted = formatData(data, `${apiID}_`, labelField)
      console.log('formatted', formatted, 'only parents:', formatted.filter(entry => !entry?.parent))
      setData(formatted.filter(entry => !entry?.parent))

      // setModels(modelsFound)
      // setModelOptions(modelOptionsFound)
      // setTargetModel(modelsFound[0])
      // setSelectedContentType(modelOptionsFound[0]?.value)
      // setHasWorkflow(modelOptionsFound[0]?.workflow)
    })
  }, [uid])

  useEffect(() => {
    console.log('updateTitle on changed labelField')
    setData(updateTitle(data, labelField))
  }, [labelField])


  const onDragStart = info => {
    console.log('start', info);
  };

  const onDragEnter = () => {
    console.log('enter');
  };

  const onDrop = info => {
    console.log('drop', info);
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const loop = (data, key, callback) => {
      data.forEach((item, index, arr) => {
        if (item.key === key) {
          callback(item, index, arr);
          return;
        }
        if (item.children) {
          loop(item.children, key, callback);
        }
      });
    };
    const treeData = [...data];

    // Find dragObject
    let dragObj;
    loop(treeData, dragKey, (item, index, arr) => {
      arr.splice(index, 1);
      dragObj = item;
    });

    if (dropPosition === 0) {
      // Drop on the content
      loop(data, dropKey, item => {
        // eslint-disable-next-line no-param-reassign
        item.children = item.children || [];
        // where to insert 示例添加到尾部，可以是随意位置
        item.children.unshift(dragObj);
      });
    } else {
      // Drop on the gap (insert before or insert after)
      let ar;
      let i;
      loop(treeData, dropKey, (item, index, arr) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj);
      } else {
        ar.splice(i + 1, 0, dragObj);
      }
    }

    console.log('set new data', treeData)
    setData(treeData)

  };

  const onExpand = expandedKeys => {
    console.log('onExpand', expandedKeys);
    setExpandedKeys(expandedKeys),
      setAutoExpandParent(false)
  };

  return (
    <div className="col-md-12">
      <Wrapper style={style}>
        <p>LabelField: {labelField}</p>
        <p>uid: {uid}</p>
        <p>apiID: {apiID}</p>
        <Tree
          expandedKeys={expandedKeys}
          onExpand={onExpand}
          autoExpandParent={autoExpandParent}
          draggable
          onDragStart={onDragStart}
          onDragEnter={onDragEnter}
          onDrop={onDrop}
          treeData={data}
        />
        {/* <ul>
            {data && data.length && data.map((item, index) => (
              <li key={`data_${apiID}_${item.id}`}>
                <span>#{index}</span> - <span>{JSON.stringify(item)}</span>
              </li>
            ))}

          </ul> */}
        {children}
      </Wrapper>
    </div>
  );
};
SortableTree.defaultProps = {
  children: null,
  labelField: null,
  description: null,
  style: {},
  title: null
};
SortableTree.propTypes = {
  uid: PropTypes.string.isRequired,
  apiID: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired,
  children: PropTypes.any,
  description: PropTypes.string,
  style: PropTypes.object,
  title: PropTypes.string
};

export default SortableTree;
