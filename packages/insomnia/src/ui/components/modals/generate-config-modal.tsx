import { autoBindMethodsForReact } from 'class-autobind-decorator';
import React, { PureComponent } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';

import { parseApiSpec } from '../../../common/api-specs';
import { AUTOBIND_CFG } from '../../../common/constants';
import type { ApiSpec } from '../../../models/api-spec';
import type { ConfigGenerator } from '../../../plugins';
import * as plugins from '../../../plugins';
import { CopyButton } from '../base/copy-button';
import { Link } from '../base/link';
import { type ModalHandle, Modal } from '../base/modal';
import { ModalBody } from '../base/modal-body';
import { ModalFooter } from '../base/modal-footer';
import { ModalHeader } from '../base/modal-header';
import { CodeEditor } from '../codemirror/code-editor';
import { HelpTooltip } from '../help-tooltip';
import { showModal } from './index';

interface Config {
  label: string;
  docsLink?: string;
  content: string;
  mimeType: string;
  error: string | null;
}

interface State {
  configs: Config[];
  activeTab: number;
}

interface ShowOptions {
  apiSpec: ApiSpec;
  activeTabLabel: string;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
export class GenerateConfigModal extends PureComponent<{}, State> {
  modal: ModalHandle | null = null;

  state: State = {
    configs: [],
    activeTab: 0,
  };

  _setModalRef(modal: ModalHandle) {
    this.modal = modal;
  }

  async _generate(generatePlugin: ConfigGenerator, apiSpec: ApiSpec) {
    const config: Config = {
      content: '',
      mimeType: 'text/yaml',
      label: generatePlugin.label,
      docsLink: generatePlugin.docsLink,
      error: null,
    };
    try {
      const result = await generatePlugin.generate(parseApiSpec(apiSpec.contents));
      if (result.document) {
        config.content = result.document;
      }
      config.error = result.error || null;
      return config;
    } catch (err) {
      config.error = err.message;
      return config;
    }
  }

  async show({ activeTabLabel, apiSpec }: ShowOptions) {
    const configs: Config[] = [];

    for (const p of await plugins.getConfigGenerators()) {
      configs.push(await this._generate(p, apiSpec));
    }

    const foundIndex = configs.findIndex(c => c.label === activeTabLabel);
    this.setState({
      configs,
      activeTab: foundIndex < 0 ? 0 : foundIndex,
    });
    this.modal?.show();
  }

  renderConfigTabPanel(config: Config) {
    const linkIcon = <i className="fa fa-external-link-square" />;
    if (config.error) {
      return (
        <TabPanel key={config.label}>
          <p className="notice error margin-md">
            {config.error}
            {config.docsLink ? <><br /><Link href={config.docsLink}>Documentation {linkIcon}</Link></> : null}
          </p>
        </TabPanel>
      );
    }

    return (
      <TabPanel key={config.label}>
        <CodeEditor
          className="tall pad-top-sm"
          defaultValue={config.content}
          mode={config.mimeType}
          readOnly
        />
      </TabPanel>
    );
  }

  _handleTabSelect(index: number) {
    this.setState({
      activeTab: index,
    });
  }

  renderConfigTab(config: Config) {
    const linkIcon = <i className="fa fa-external-link-square" />;
    return (
      <Tab key={config.label} tabIndex="-1">
        <button>
          {config.label}
          {config.docsLink ?
            <>
              {' '}
              <HelpTooltip>
                To learn more about {config.label}
                <br />
                <Link href={config.docsLink}>Documentation {linkIcon}</Link>
              </HelpTooltip>
            </> : null}
        </button>
      </Tab>
    );
  }

  render() {
    const { configs, activeTab } = this.state;
    const activeConfig = configs[activeTab];
    return (
      <Modal ref={this._setModalRef} tall>
        <ModalHeader>Generate Config</ModalHeader>
        <ModalBody className="wide">
          <Tabs forceRenderTabPanel defaultIndex={activeTab} onSelect={this._handleTabSelect}>
            <TabList>{configs.map(this.renderConfigTab)}</TabList>
            {configs.map(this.renderConfigTabPanel)}
          </Tabs>
        </ModalBody>
        {activeConfig && (
          <ModalFooter>
            <CopyButton className="btn" content={activeConfig.content}>
              Copy to Clipboard
            </CopyButton>
          </ModalFooter>
        )}
      </Modal>
    );
  }
}

export const showGenerateConfigModal = (opts: ShowOptions) => showModal(GenerateConfigModal, opts);
