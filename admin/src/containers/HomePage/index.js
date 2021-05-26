/**
 *
 * HomePage
 *
 */

import React, { memo, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import pluginPkg from '../../../../package.json';
import pluginId from '../../pluginId';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import {
  HeaderNav,
  LoadingIndicator,
  PluginHeader,
  request
} from "strapi-helper-plugin";
import { Button, Checkbox, Flex, Select, Text, Label, Toggle } from "@buffetjs/core";
import { Fail, Globe, Success } from "@buffetjs/icons"
import { get, has } from "lodash";

import Row from "../../components/Row";
import Block from "../../components/Block";
import SortableTree from "../../components/SortableTree";

const getUrl = (to) =>
  to ? `/plugins/${pluginId}/${to}` : `/plugins/${pluginId}`;

const getLabelFields = (fields) => {
  return fields.filter(fieldName => ['name', 'label', 'title'].indexOf(fieldName) !== -1)
}

const getStringFields = (fields) => {
  return Object.entries(fields).map(
    ([key, value]) =>
      ['uid', 'string'].indexOf(value?.type) !== -1
        ? key : null
  ).filter(key => key)
}

const HomePage = () => {

  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
  const pluginIcon = pluginPkg.strapi.icon;
  const pluginName = pluginPkg.strapi.name;

  const [isLoading, setIsLoading] = useState(true)
  const [modelOptions, setModelOptions] = useState([])
  const [models, setModels] = useState([])
  const [localeOptions, setLocaleOptions] = useState([])
  const [locales, setLocales] = useState([])
  const [saveAsDraft, setSaveAsDraft] = useState(false)
  const [targetModel, setTargetModel] = useState()
  const [labelField, setLabelField] = useState()
  const [labelFields, setLabelFields] = useState([])
  const [hasWorkflow, setHasWorkflow] = useState(false)
  const [defaultLocale, setDefaultLocale] = useState("en")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [importSource, setImportSource] = useState("upload")
  const [analysis, setAnalysis] = useState(null)
  const [analysisConfig, setAnalysisConfig] = useState({})
  const [selectedContentType, setSelectedContentType] = useState("")
  const [fieldMapping, setFieldMapping] = useState({})
  const [insertOrUpdate, setInsertOrUpdate] = useState(false)
  const [sourceField, setSourceField] = useState()
  const [targetField, setTargetField] = useState()
  const [ignoreMissing, setIgnoreMissing] = useState(true)

  useEffect(() => {
    getModels().then(res => {
      const { modelsFound, modelOptionsFound } = res;
      console.log('modelsFound, modelOptionsFound', modelsFound, modelOptionsFound)
      setModels(modelsFound)
      setModelOptions(modelOptionsFound)
      setTargetModel(modelsFound[0])
      setSelectedContentType(modelOptionsFound[0]?.value)
      setHasWorkflow(modelOptionsFound[0]?.workflow)
    })
  }, [])

  useEffect(() => {
    const fullTargetModel = models.find(model =>
      model.uid === selectedContentType
    )
    setTargetModel(fullTargetModel)
    setHasWorkflow(!!modelOptions.find(model =>
      model.value === selectedContentType && model.workflow
    ))
    if (fullTargetModel?.schema?.attributes) {
      const stringFields = getStringFields(fullTargetModel.schema.attributes)
      setLabelFields(
        stringFields.map(fieldName => ({ value: fieldName, label: fieldName }))
      )

      if (stringFields.length > 0) {
        setLabelField(stringFields.shift())
      }

    }

  }, [selectedContentType])

  useEffect(() => {
    getLocales().then(res => {
      const { localesFound, localeOptionsFound } = res;
      setLocales(localesFound)
      setLocaleOptions(localeOptionsFound)
      setDefaultLocale(localeOptionsFound.filter(locale => locale.default))
    })
  }, [])

  const onSaveImport = async () => {
    setIsSaving(true)
    const importConfig = {
      ...analysisConfig,
      contentType: selectedContentType,
      fieldMapping,
      options: { saveAsDraft, locales: localeOptions, update: insertOrUpdate ? { sourceField, targetField, ignoreMissing } : false }
    };
    // console.log("onSaveImport config", importConfig)
    try {
      await request("/import-content", { method: "POST", body: importConfig });
      setIsSaving(false)
      strapi.notification.toggle({ type: "info", message: "Import started" });
    } catch (e) {
      strapi.notification.toggle({ type: "error", message: `${e}` });
    }
  };

  const getModels = async () => {
    setIsLoading(true);
    try {
      const response = await request("/content-type-builder/content-types", {
        method: "GET"
      });

      // Remove non-user content types from models
      const modelsFound = get(response, ["data"], []).filter(
        obj => !has(obj, "plugin")
      );
      const modelOptionsFound = modelsFound.map(model => {
        return {
          label: get(model, ["schema", "name"], ""), // (name is used for display_name)
          value: model.uid, // (uid is used for table creations)
          workflow: model.schema?.draftAndPublish,
          localized: model.schema?.pluginOptions?.i18n?.localized,
        };
      });

      setIsLoading(false);

      // console.log('modelsFound', modelsFound, 'vs models', models)

      return { modelsFound, modelOptionsFound };
    } catch (e) {
      setIsLoading(false)
      return {}
      // strapi.notification.toggle({ type: 'error', message: `${e}` });
    }
    return [];
  };

  const getLocales = async () => {
    setIsLoading(true);
    try {
      const localesFound = await request("/i18n/locales", {
        method: "GET"
      });
      const localeOptionsFound = localesFound.map(locale => {
        return {
          label: locale.name,
          value: locale.code,
          default: locale.isDefault
        };
      });

      setIsLoading(false);

      return { localesFound, localeOptionsFound };
    } catch (e) {
      setIsLoading(false)
      strapi.notification.toggle({ type: 'error', message: `${e}` });
    }
    return [];
  };

  const onRequestAnalysis = async (config) => {
    setIsAnalyzing(true)
    setAnalysisConfig(config)
    try {
      const response = await request("/import-content/preAnalyzeImportFile", {
        method: "POST",
        body: config
      });
      setAnalysis(response)
      setIsAnalyzing(false)
      strapi.notification.toggle({ type: 'success', message: `Analyzed Successfully` });
    } catch (e) {
      setIsAnalyzing(false)
      strapi.notification.toggle({ type: 'error', message: `Analyze Failed, try again` });
      strapi.notification.toggle({ type: 'error', message: `${e}` });
    }
  };

  const selectedModel = models.find(model => model?.uid && selectedContentType && model.uid === selectedContentType)

  const { uid = '', schema = {}, apiID = '' } = selectedModel || {}

  return (
    <div className="container-fluid" style={{ padding: "18px 30px" }}>
      <PluginHeader
        title={pluginName}
        icon={pluginIcon}
        description={pluginDescription}
      />
      <div className="row">
        <Block
          title="General"
          description="Configure the Import Source &amp; Destination"
          style={{ marginBottom: 12 }}
        >
          <Row className="row">
            <div className="col-3">
              <Label htmlFor="importDest">Content type to Sort</Label>
              <Select
                value={selectedContentType}
                name="importDest"
                options={modelOptions}
                onChange={({ target: { value } }) =>
                  setSelectedContentType(value)
                }
              />
            </div>
            {selectedContentType && (
              <>
                <div className="col-3">
                  <Label htmlFor="workflow">Workflow enabled {
                    hasWorkflow ? <Success fill="green" /> : <Fail color="silver" />
                  }
                  </Label>
                  {hasWorkflow &&
                    <Checkbox
                      message="Save imported items as Draft"
                      name="saveAsDraft"
                      value={saveAsDraft} onChange={e => setSaveAsDraft(e.target.value)} />
                  }
                </div>
                <div className="col-3">
                  <Label htmlFor="labelField">Field to use as draggable label</Label>
                  <Select
                    value={labelField}
                    name="labelField"
                    options={labelFields}
                    onChange={({ target: { value } }) =>
                      setLabelField(value)
                    }
                  />
                </div>
              </>
            )}
          </Row>
        </Block>
      </div>
      {(analysis || true) && (
        <Row className="row">
          <SortableTree
            uid={uid}
            schema={schema}
            apiID={apiID}
            labelField={labelField}
          />
          <Button
            style={{ marginTop: 12 }}
            label="Save the Tree"
            onClick={onSaveImport}
            isLoading={isLoading}
          />
        </Row>
      )}
    </div>
  )
}

export default HomePage;
